-- Chat: ห้องแยกทีมต่อโปรเจกต์ (ลูกค้า / Account / Ads / Sales)

ALTER TABLE public.chat_rooms
  ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'client';

ALTER TABLE public.chat_rooms
  DROP CONSTRAINT IF EXISTS chat_rooms_project_id_key;

ALTER TABLE public.chat_rooms
  DROP CONSTRAINT IF EXISTS chat_rooms_project_channel_key;

ALTER TABLE public.chat_rooms
  ADD CONSTRAINT chat_rooms_project_channel_key UNIQUE (project_id, channel);

ALTER TABLE public.chat_rooms
  DROP CONSTRAINT IF EXISTS chat_rooms_channel_check;

ALTER TABLE public.chat_rooms
  ADD CONSTRAINT chat_rooms_channel_check
  CHECK (channel IN ('client', 'account', 'ads', 'sales'));

UPDATE public.chat_rooms SET channel = 'client' WHERE channel IS NULL OR trim(channel) = '';

CREATE INDEX IF NOT EXISTS chat_rooms_project_channel_idx
  ON public.chat_rooms (project_id, channel);

-- สร้างห้องทีมที่ขาดสำหรับโปรเจกต์เดิม
INSERT INTO public.chat_rooms (project_id, channel)
SELECT p.id, ch.channel
FROM public.projects p
CROSS JOIN (
  VALUES ('client'), ('account'), ('ads'), ('sales')
) AS ch(channel)
ON CONFLICT (project_id, channel) DO NOTHING;

CREATE OR REPLACE FUNCTION public.user_can_access_chat_channel(
  p_project_id UUID,
  p_channel TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.user_can_access_project(p_project_id)
    AND p_channel IN ('client', 'account', 'ads', 'sales')
    AND (
      (
        public.has_role('client')
        AND p_channel = 'client'
      )
      OR (
        NOT public.has_role('client')
        AND (
          p_channel = 'client'
          OR public.is_privileged()
          OR (
            p_channel = 'account'
            AND public.has_any_role(ARRAY['account']::public.app_role[])
          )
          OR (
            p_channel = 'ads'
            AND public.has_any_role(ARRAY['ads', 'senior_ads']::public.app_role[])
          )
          OR (
            p_channel = 'sales'
            AND public.has_role('sales')
          )
        )
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.ensure_project_chat_channel(
  p_project_id UUID,
  p_channel TEXT DEFAULT 'client'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room_id UUID;
BEGIN
  IF NOT public.user_can_access_chat_channel(p_project_id, p_channel) THEN
    RAISE EXCEPTION 'chat channel access denied';
  END IF;

  INSERT INTO public.chat_rooms (project_id, channel)
  VALUES (p_project_id, p_channel)
  ON CONFLICT (project_id, channel) DO NOTHING;

  SELECT id INTO v_room_id
  FROM public.chat_rooms
  WHERE project_id = p_project_id
    AND channel = p_channel;

  RETURN v_room_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_project_chat_room(p_project_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.ensure_project_chat_channel(p_project_id, 'client');
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_project_chat_channels(p_project_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_channel TEXT;
  v_result JSONB := '[]'::jsonb;
BEGIN
  IF NOT public.user_can_access_project(p_project_id) THEN
    RAISE EXCEPTION 'project access denied';
  END IF;

  FOREACH v_channel IN ARRAY ARRAY['client', 'account', 'ads', 'sales']
  LOOP
    IF public.user_can_access_chat_channel(p_project_id, v_channel) THEN
      PERFORM public.ensure_project_chat_channel(p_project_id, v_channel);
      v_result := v_result || jsonb_build_array(
        jsonb_build_object(
          'channel', v_channel,
          'room_id', (
            SELECT id FROM public.chat_rooms
            WHERE project_id = p_project_id AND channel = v_channel
          )
        )
      );
    END IF;
  END LOOP;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_project_chat_channels(p_project_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  PERFORM public.ensure_project_chat_channels(p_project_id);

  RETURN COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'channel', r.channel,
          'room_id', r.id,
          'label', CASE r.channel
            WHEN 'client' THEN 'ลูกค้า'
            WHEN 'account' THEN 'Account'
            WHEN 'ads' THEN 'Ads'
            WHEN 'sales' THEN 'Sales'
            ELSE r.channel
          END
        )
        ORDER BY CASE r.channel
          WHEN 'client' THEN 1
          WHEN 'account' THEN 2
          WHEN 'ads' THEN 3
          WHEN 'sales' THEN 4
          ELSE 9
        END
      )
      FROM public.chat_rooms r
      WHERE r.project_id = p_project_id
        AND public.user_can_access_chat_channel(p_project_id, r.channel)
    ),
    '[]'::jsonb
  );
END;
$$;

DROP POLICY IF EXISTS chat_rooms_select ON public.chat_rooms;

CREATE POLICY chat_rooms_select ON public.chat_rooms
  FOR SELECT TO authenticated
  USING (public.user_can_access_chat_channel(project_id, channel));

-- แจ้งเตือนตามห้องทีม
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
  v_channel TEXT;
  v_sender_is_client BOOLEAN;
  v_recipient UUID;
  v_preview TEXT;
  v_dedupe TEXT;
  v_link TEXT;
BEGIN
  IF NEW.message_type = 'system' THEN
    RETURN NEW;
  END IF;

  SELECT r.project_id, r.channel, pr.customer_id, c.brand_name, pr.project_name
  INTO v_project_id, v_channel, v_customer_id, v_brand, v_project_name
  FROM public.chat_rooms r
  INNER JOIN public.projects pr ON pr.id = r.project_id
  INNER JOIN public.customers c ON c.id = pr.customer_id
  WHERE r.id = NEW.room_id;

  IF v_project_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_sender_is_client := EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = NEW.sender_id AND ur.role = 'client'::public.app_role
  );

  v_preview := CASE
    WHEN NEW.message_type = 'file' THEN
      '📎 ' || COALESCE(NEW.attachment_name, LEFT(TRIM(NEW.body), 80), 'ไฟล์')
    ELSE LEFT(TRIM(NEW.body), 120)
  END;
  v_dedupe := 'chat-msg-' || NEW.id::text;

  v_link := '/app/chat?project=' || v_project_id::text || '&channel=' || v_channel;

  FOR v_recipient IN
    SELECT DISTINCT r.uid
    FROM (
      -- ห้องลูกค้า: ลูกค้า ↔ ทีม (เหมือนเดิม)
      SELECT cca.user_id AS uid
      FROM public.client_customer_access cca
      WHERE v_channel = 'client'
        AND cca.customer_id = v_customer_id
        AND NOT v_sender_is_client
      UNION
      SELECT pr.account_owner_id FROM public.projects pr
      WHERE v_channel = 'client' AND v_sender_is_client AND pr.id = v_project_id AND pr.account_owner_id IS NOT NULL
      UNION
      SELECT pr.ads_owner_id FROM public.projects pr
      WHERE v_channel = 'client' AND v_sender_is_client AND pr.id = v_project_id AND pr.ads_owner_id IS NOT NULL
      UNION
      SELECT c.account_owner_id FROM public.customers c
      WHERE v_channel = 'client' AND v_sender_is_client AND c.id = v_customer_id AND c.account_owner_id IS NOT NULL
      UNION
      SELECT c.ads_owner_id FROM public.customers c
      WHERE v_channel = 'client' AND v_sender_is_client AND c.id = v_customer_id AND c.ads_owner_id IS NOT NULL
      UNION
      SELECT c.sales_owner_id FROM public.customers c
      WHERE v_channel = 'client' AND v_sender_is_client AND c.id = v_customer_id
      UNION
      SELECT ur.user_id FROM public.user_roles ur
      WHERE v_channel = 'client' AND v_sender_is_client
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
      -- ห้อง Account
      UNION
      SELECT ur.user_id FROM public.user_roles ur
      WHERE v_channel = 'account'
        AND ur.role IN (
          'account'::public.app_role,
          'ceo'::public.app_role,
          'operations'::public.app_role,
          'dev'::public.app_role,
          'admin'::public.app_role
        )
      UNION
      SELECT pr.account_owner_id FROM public.projects pr
      WHERE v_channel = 'account' AND pr.id = v_project_id AND pr.account_owner_id IS NOT NULL
      -- ห้อง Ads
      UNION
      SELECT ur.user_id FROM public.user_roles ur
      WHERE v_channel = 'ads'
        AND ur.role IN (
          'ads'::public.app_role,
          'senior_ads'::public.app_role,
          'ceo'::public.app_role,
          'operations'::public.app_role,
          'dev'::public.app_role,
          'admin'::public.app_role
        )
      UNION
      SELECT pr.ads_owner_id FROM public.projects pr
      WHERE v_channel = 'ads' AND pr.id = v_project_id AND pr.ads_owner_id IS NOT NULL
      -- ห้อง Sales
      UNION
      SELECT ur.user_id FROM public.user_roles ur
      WHERE v_channel = 'sales'
        AND ur.role IN (
          'sales'::public.app_role,
          'ceo'::public.app_role,
          'operations'::public.app_role,
          'dev'::public.app_role,
          'admin'::public.app_role
        )
      UNION
      SELECT c.sales_owner_id FROM public.customers c
      WHERE v_channel = 'sales' AND c.id = v_customer_id AND c.sales_owner_id IS NOT NULL
    ) r
    INNER JOIN public.profiles p ON p.id = r.uid
    WHERE p.is_active = TRUE
      AND r.uid IS DISTINCT FROM NEW.sender_id
      AND (
        v_channel = 'client'
        OR NOT EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = r.uid AND ur.role = 'client'::public.app_role
        )
      )
  LOOP
    IF NOT public.user_can_access_chat_channel(v_project_id, v_channel) THEN
      CONTINUE;
    END IF;

    INSERT INTO public.user_notifications (
      user_id, dedupe_key, title, body, link, severity
    )
    VALUES (
      v_recipient,
      v_dedupe,
      CASE v_channel
        WHEN 'client' THEN
          CASE WHEN v_sender_is_client
            THEN 'แชทลูกค้า: ' || COALESCE(v_brand, v_project_name)
            ELSE 'ข้อความใหม่: ' || COALESCE(v_project_name, v_brand)
          END
        WHEN 'account' THEN 'แชท Account · ' || COALESCE(v_project_name, v_brand)
        WHEN 'ads' THEN 'แชท Ads · ' || COALESCE(v_project_name, v_brand)
        WHEN 'sales' THEN 'แชท Sales · ' || COALESCE(v_project_name, v_brand)
        ELSE 'แชท: ' || COALESCE(v_project_name, v_brand)
      END,
      v_preview,
      CASE
        WHEN EXISTS (
          SELECT 1 FROM public.client_customer_access cca
          WHERE cca.user_id = v_recipient AND cca.customer_id = v_customer_id
        ) AND v_channel = 'client'
        THEN '/app/client/chat?channel=client'
        ELSE v_link
      END,
      'info'
    )
    ON CONFLICT (user_id, dedupe_key) DO UPDATE
      SET title = EXCLUDED.title, body = EXCLUDED.body, link = EXCLUDED.link,
          read_at = NULL, updated_at = NOW();
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
        'channel', r.channel,
        'channel_label', CASE r.channel
          WHEN 'client' THEN 'ลูกค้า'
          WHEN 'account' THEN 'Account'
          WHEN 'ads' THEN 'Ads'
          WHEN 'sales' THEN 'Sales'
          ELSE r.channel
        END,
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
        ON rr.room_id = m.room_id AND rr.user_id = auth.uid()
      WHERE m.room_id = r.id
        AND m.sender_id IS DISTINCT FROM auth.uid()
        AND m.message_type <> 'system'
        AND m.created_at > COALESCE(rr.last_read_at, '-infinity'::timestamptz)
    ) u ON TRUE
    WHERE public.user_can_access_chat_channel(pr.id, r.channel)
  ) sub;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.user_can_access_chat_channel FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ensure_project_chat_channel FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ensure_project_chat_channels FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_project_chat_channels FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.user_can_access_chat_channel(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_project_chat_channel(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_project_chat_channels(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_project_chat_channels(UUID) TO authenticated;
