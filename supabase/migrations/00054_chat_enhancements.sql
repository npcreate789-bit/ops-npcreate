-- Chat Phase 2: อ่านแล้ว, กล่องข้อความ (inbox), แจ้งเตือนข้อความใหม่

CREATE TABLE IF NOT EXISTS public.chat_room_reads (
  room_id UUID NOT NULL REFERENCES public.chat_rooms (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (room_id, user_id)
);

CREATE INDEX IF NOT EXISTS chat_room_reads_user_id_idx
  ON public.chat_room_reads (user_id, last_read_at DESC);

ALTER TABLE public.chat_room_reads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS chat_room_reads_own ON public.chat_room_reads;

CREATE POLICY chat_room_reads_own ON public.chat_room_reads
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.mark_chat_room_read(p_room_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  INSERT INTO public.chat_room_reads (room_id, user_id, last_read_at)
  VALUES (p_room_id, auth.uid(), NOW())
  ON CONFLICT (room_id, user_id) DO UPDATE
    SET last_read_at = EXCLUDED.last_read_at;
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
        'last_message_body', lm.body,
        'last_message_at', lm.created_at,
        'last_sender_id', lm.sender_id,
        'unread_count', COALESCE(u.cnt, 0)
      ) AS row_data,
      COALESCE(lm.created_at, r.updated_at) AS sort_at
    FROM public.chat_rooms r
    INNER JOIN public.projects pr ON pr.id = r.project_id
    INNER JOIN public.customers c ON c.id = pr.customer_id
    LEFT JOIN LATERAL (
      SELECT m.body, m.created_at, m.sender_id
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
        AND m.created_at > COALESCE(rr.last_read_at, '-infinity'::timestamptz)
    ) u ON TRUE
    WHERE public.user_can_access_project(pr.id)
  ) sub;

  RETURN v_result;
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
  v_link TEXT;
  v_dedupe TEXT;
BEGIN
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

  v_preview := LEFT(TRIM(NEW.body), 120);
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

DROP TRIGGER IF EXISTS chat_messages_notify_recipients ON public.chat_messages;

CREATE TRIGGER chat_messages_notify_recipients
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_chat_message_recipients();

REVOKE ALL ON FUNCTION public.mark_chat_room_read FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_my_chat_inbox FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_chat_room_read(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_my_chat_inbox() TO authenticated;
