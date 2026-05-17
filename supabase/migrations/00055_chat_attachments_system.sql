-- Chat Phase 3: แนบไฟล์ + ข้อความระบบ

ALTER TABLE public.chat_messages
  DROP CONSTRAINT IF EXISTS chat_messages_body_len;

ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS message_type TEXT NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS attachment_path TEXT,
  ADD COLUMN IF NOT EXISTS attachment_name TEXT,
  ADD COLUMN IF NOT EXISTS attachment_mime TEXT,
  ADD COLUMN IF NOT EXISTS attachment_size BIGINT;

ALTER TABLE public.chat_messages
  DROP CONSTRAINT IF EXISTS chat_messages_type_check;

ALTER TABLE public.chat_messages
  ADD CONSTRAINT chat_messages_type_check
  CHECK (message_type IN ('text', 'system', 'file'));

ALTER TABLE public.chat_messages
  ADD CONSTRAINT chat_messages_body_len CHECK (
    char_length(body) <= 4000
    AND (
      (message_type = 'text' AND char_length(trim(body)) >= 1)
      OR message_type = 'system'
      OR (message_type = 'file' AND attachment_path IS NOT NULL)
    )
  );

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-attachments',
  'chat-attachments',
  false,
  26214400,
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf'
  ]
)
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.chat_storage_project_id(p_path TEXT)
RETURNS UUID
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF((storage.foldername(p_path))[1], '')::uuid;
$$;

DROP POLICY IF EXISTS chat_attachments_storage_select ON storage.objects;
DROP POLICY IF EXISTS chat_attachments_storage_insert ON storage.objects;

CREATE POLICY chat_attachments_storage_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'chat-attachments'
    AND public.user_can_access_project(public.chat_storage_project_id(name))
  );

CREATE POLICY chat_attachments_storage_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'chat-attachments'
    AND public.user_can_access_project(public.chat_storage_project_id(name))
  );

CREATE OR REPLACE FUNCTION public.send_chat_file_message(
  p_room_id UUID,
  p_storage_path TEXT,
  p_file_name TEXT,
  p_mime_type TEXT DEFAULT NULL,
  p_byte_size BIGINT DEFAULT NULL,
  p_caption TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_id UUID;
  v_folder_project UUID;
  v_message_id UUID;
  v_body TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT r.project_id INTO v_project_id
  FROM public.chat_rooms r
  WHERE r.id = p_room_id;

  IF v_project_id IS NULL OR NOT public.user_can_access_project(v_project_id) THEN
    RAISE EXCEPTION 'chat room access denied';
  END IF;

  v_folder_project := public.chat_storage_project_id(p_storage_path);
  IF v_folder_project IS DISTINCT FROM v_project_id THEN
    RAISE EXCEPTION 'invalid storage path';
  END IF;

  v_body := COALESCE(NULLIF(trim(p_caption), ''), trim(p_file_name));

  INSERT INTO public.chat_messages (
    room_id,
    sender_id,
    body,
    message_type,
    attachment_path,
    attachment_name,
    attachment_mime,
    attachment_size
  )
  VALUES (
    p_room_id,
    auth.uid(),
    v_body,
    'file',
    p_storage_path,
    trim(p_file_name),
    NULLIF(trim(p_mime_type), ''),
    p_byte_size
  )
  RETURNING id INTO v_message_id;

  RETURN v_message_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.insert_chat_system_message(
  p_room_id UUID,
  p_body TEXT,
  p_created_task_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_message_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.chat_rooms r
    WHERE r.id = p_room_id
      AND public.user_can_access_project(r.project_id)
  ) THEN
    RAISE EXCEPTION 'chat room access denied';
  END IF;

  IF char_length(trim(p_body)) < 1 THEN
    RAISE EXCEPTION 'message body required';
  END IF;

  INSERT INTO public.chat_messages (
    room_id,
    sender_id,
    body,
    message_type,
    created_task_id
  )
  VALUES (
    p_room_id,
    auth.uid(),
    trim(p_body),
    'system',
    p_created_task_id
  )
  RETURNING id INTO v_message_id;

  RETURN v_message_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_chat_message_recipients()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_id UUID;
  v_customer_id UUID;
  v_brand TEXT;
  v_project_name TEXT;
  v_sender_is_client BOOLEAN;
  v_recipient UUID;
  v_preview TEXT;
  v_dedupe TEXT;
BEGIN
  IF NEW.message_type = 'system' THEN
    RETURN NEW;
  END IF;

  SELECT r.project_id, pr.customer_id, c.brand_name, pr.project_name
  INTO v_project_id, v_customer_id, v_brand, v_project_name
  FROM public.chat_rooms r
  INNER JOIN public.projects pr ON pr.id = r.project_id
  INNER JOIN public.customers c ON c.id = pr.customer_id
  WHERE r.id = NEW.room_id;

  IF v_project_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_sender_is_client := EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = NEW.sender_id
      AND ur.role = 'client'::public.app_role
  );

  v_preview := CASE
    WHEN NEW.message_type = 'file' THEN
      '📎 ' || COALESCE(NEW.attachment_name, LEFT(TRIM(NEW.body), 80), 'ไฟล์')
    ELSE LEFT(TRIM(NEW.body), 120)
  END;
  v_dedupe := 'chat-msg-' || NEW.id::text;

  FOR v_recipient IN
    SELECT DISTINCT r.uid
    FROM (
      SELECT pr.account_owner_id AS uid
      FROM public.projects pr
      WHERE pr.id = v_project_id
        AND v_sender_is_client
        AND pr.account_owner_id IS NOT NULL
      UNION
      SELECT pr.ads_owner_id
      FROM public.projects pr
      WHERE pr.id = v_project_id
        AND v_sender_is_client
        AND pr.ads_owner_id IS NOT NULL
      UNION
      SELECT c.account_owner_id
      FROM public.customers c
      WHERE c.id = v_customer_id
        AND v_sender_is_client
        AND c.account_owner_id IS NOT NULL
      UNION
      SELECT c.ads_owner_id
      FROM public.customers c
      WHERE c.id = v_customer_id
        AND v_sender_is_client
        AND c.ads_owner_id IS NOT NULL
      UNION
      SELECT c.sales_owner_id
      FROM public.customers c
      WHERE c.id = v_customer_id
        AND v_sender_is_client
      UNION
      SELECT ur.user_id
      FROM public.user_roles ur
      WHERE v_sender_is_client
        AND ur.role IN (
          'ceo'::public.app_role,
          'operations'::public.app_role,
          'dev'::public.app_role,
          'account'::public.app_role,
          'sales'::public.app_role,
          'ads'::public.app_role,
          'senior_ads'::public.app_role,
          'content'::public.app_role
        )
      UNION
      SELECT cca.user_id
      FROM public.client_customer_access cca
      WHERE cca.customer_id = v_customer_id
        AND NOT v_sender_is_client
    ) r
    INNER JOIN public.profiles p ON p.id = r.uid
    WHERE p.is_active = TRUE
      AND r.uid IS DISTINCT FROM NEW.sender_id
  LOOP
    INSERT INTO public.user_notifications (
      user_id,
      dedupe_key,
      title,
      body,
      link,
      severity
    )
    VALUES (
      v_recipient,
      v_dedupe,
      CASE
        WHEN v_sender_is_client THEN 'แชทจากลูกค้า: ' || COALESCE(v_brand, v_project_name)
        ELSE 'ข้อความใหม่: ' || COALESCE(v_project_name, v_brand)
      END,
      v_preview,
      CASE
        WHEN EXISTS (
          SELECT 1
          FROM public.client_customer_access cca
          WHERE cca.user_id = v_recipient
            AND cca.customer_id = v_customer_id
        ) THEN '/app/client/chat'
        ELSE '/app/chat?project=' || v_project_id::text
      END,
      'info'
    )
    ON CONFLICT (user_id, dedupe_key) DO UPDATE
      SET
        title = EXCLUDED.title,
        body = EXCLUDED.body,
        link = EXCLUDED.link,
        severity = EXCLUDED.severity,
        read_at = NULL,
        updated_at = NOW();
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_my_chat_inbox()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT COALESCE(
    jsonb_agg(row_data ORDER BY sort_at DESC NULLS LAST),
    '[]'::jsonb
  )
  INTO v_result
  FROM (
    SELECT
      jsonb_build_object(
        'room_id', r.id,
        'project_id', pr.id,
        'project_name', pr.project_name,
        'customer_id', pr.customer_id,
        'brand_name', c.brand_name,
        'last_message_body', CASE
          WHEN lm.message_type = 'file' THEN
            '📎 ' || COALESCE(lm.attachment_name, NULLIF(trim(lm.body), ''), 'ไฟล์')
          ELSE lm.body
        END,
        'last_message_at', lm.created_at,
        'last_sender_id', lm.sender_id,
        'unread_count', COALESCE(u.cnt, 0)
      ) AS row_data,
      COALESCE(lm.created_at, r.updated_at) AS sort_at
    FROM public.chat_rooms r
    INNER JOIN public.projects pr ON pr.id = r.project_id
    INNER JOIN public.customers c ON c.id = pr.customer_id
    LEFT JOIN LATERAL (
      SELECT m.body, m.created_at, m.sender_id, m.message_type, m.attachment_name
      FROM public.chat_messages m
      WHERE m.room_id = r.id
      ORDER BY m.created_at DESC
      LIMIT 1
    ) lm ON TRUE
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::int AS cnt
      FROM public.chat_messages m
      LEFT JOIN public.chat_room_reads rr
        ON rr.room_id = m.room_id
        AND rr.user_id = auth.uid()
      WHERE m.room_id = r.id
        AND m.sender_id IS DISTINCT FROM auth.uid()
        AND m.message_type <> 'system'
        AND m.created_at > COALESCE(rr.last_read_at, '-infinity'::timestamptz)
    ) u ON TRUE
    WHERE public.user_can_access_project(pr.id)
  ) sub;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.send_chat_file_message FROM PUBLIC;
REVOKE ALL ON FUNCTION public.insert_chat_system_message FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.send_chat_file_message TO authenticated;
GRANT EXECUTE ON FUNCTION public.insert_chat_system_message TO authenticated;
