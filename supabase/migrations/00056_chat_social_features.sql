-- Chat Phase 4: @mention, อ่านแล้ว, ปักหมุด, เทมเพลต, reaction

-- ── Mentions ──
CREATE TABLE IF NOT EXISTS public.chat_message_mentions (
  message_id UUID NOT NULL REFERENCES public.chat_messages (id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  mention_login TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (message_id, mentioned_user_id)
);

CREATE INDEX IF NOT EXISTS chat_message_mentions_user_idx
  ON public.chat_message_mentions (mentioned_user_id, created_at DESC);

ALTER TABLE public.chat_message_mentions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS chat_message_mentions_select ON public.chat_message_mentions;

CREATE POLICY chat_message_mentions_select ON public.chat_message_mentions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.chat_messages m
      INNER JOIN public.chat_rooms r ON r.id = m.room_id
      WHERE m.id = chat_message_mentions.message_id
        AND public.user_can_access_project(r.project_id)
    )
  );

-- ── Pinned messages ──
CREATE TABLE IF NOT EXISTS public.chat_pinned_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.chat_rooms (id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES public.chat_messages (id) ON DELETE CASCADE,
  pinned_by UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  pinned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (room_id, message_id)
);

CREATE INDEX IF NOT EXISTS chat_pinned_messages_room_idx
  ON public.chat_pinned_messages (room_id, pinned_at DESC);

ALTER TABLE public.chat_pinned_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS chat_pinned_select ON public.chat_pinned_messages;

CREATE POLICY chat_pinned_select ON public.chat_pinned_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.chat_rooms r
      WHERE r.id = chat_pinned_messages.room_id
        AND public.user_can_access_project(r.project_id)
    )
  );

DROP POLICY IF EXISTS chat_pinned_manage ON public.chat_pinned_messages;

CREATE POLICY chat_pinned_manage ON public.chat_pinned_messages
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.chat_rooms r
      WHERE r.id = chat_pinned_messages.room_id
        AND public.user_can_access_project(r.project_id)
    )
  )
  WITH CHECK (
    pinned_by = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.chat_rooms r
      WHERE r.id = chat_pinned_messages.room_id
        AND public.user_can_access_project(r.project_id)
    )
  );

-- ── Reactions ──
CREATE TABLE IF NOT EXISTS public.chat_message_reactions (
  message_id UUID NOT NULL REFERENCES public.chat_messages (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  emoji TEXT NOT NULL CHECK (emoji IN ('👍', '✅', '❤️', '😂', '🙏')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (message_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS chat_message_reactions_message_idx
  ON public.chat_message_reactions (message_id);

ALTER TABLE public.chat_message_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS chat_reactions_select ON public.chat_message_reactions;

CREATE POLICY chat_reactions_select ON public.chat_message_reactions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.chat_messages m
      INNER JOIN public.chat_rooms r ON r.id = m.room_id
      WHERE m.id = chat_message_reactions.message_id
        AND public.user_can_access_project(r.project_id)
    )
  );

DROP POLICY IF EXISTS chat_reactions_manage ON public.chat_message_reactions;

CREATE POLICY chat_reactions_manage ON public.chat_message_reactions
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── Message templates (ทีม) ──
CREATE TABLE IF NOT EXISTS public.chat_message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  body TEXT NOT NULL CHECK (char_length(trim(body)) BETWEEN 1 AND 2000),
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER chat_message_templates_set_updated_at
  BEFORE UPDATE ON public.chat_message_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.chat_message_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS chat_templates_select ON public.chat_message_templates;

CREATE POLICY chat_templates_select ON public.chat_message_templates
  FOR SELECT TO authenticated
  USING (
    is_active = TRUE
    AND NOT EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'client'::public.app_role
    )
  );

DROP POLICY IF EXISTS chat_templates_manage ON public.chat_message_templates;

CREATE POLICY chat_templates_manage ON public.chat_message_templates
  FOR ALL TO authenticated
  USING (public.is_privileged())
  WITH CHECK (public.is_privileged());

INSERT INTO public.chat_message_templates (label, body, sort_order)
SELECT v.label, v.body, v.sort_order
FROM (
  VALUES
    ('ทักทายลูกค้า', 'สวัสดีครับ/ค่ะ ทีม NP Create พร้อมช่วยเหลือครับ', 10),
    ('รับทราบ', 'รับทราบครับ จะดำเนินการให้ทันที', 20),
    ('ขอข้อมูลเพิ่ม', 'ขอรายละเอียดเพิ่มเติมหน่อยครับ', 30),
    ('ขอไฟล์', 'ส่งไฟล์ / สกรีนช็อตมาได้เลยครับ', 40)
) AS v(label, body, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.chat_message_templates LIMIT 1);

-- ── Process @mentions + notify ──
CREATE OR REPLACE FUNCTION public.process_chat_message_mentions()
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
  v_handle TEXT;
  v_mentioned UUID;
  v_link TEXT;
BEGIN
  IF NEW.message_type IS DISTINCT FROM 'text' OR NEW.sender_id IS NULL THEN
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

  FOR v_handle IN
    SELECT DISTINCT lower(m[1])
    FROM regexp_matches(NEW.body, '@([a-z0-9._-]{2,32})', 'gi') AS m
  LOOP
    SELECT p.id
    INTO v_mentioned
    FROM public.profiles p
    WHERE p.is_active = TRUE
      AND lower(p.login_id) = v_handle
    LIMIT 1;

    IF v_mentioned IS NULL OR v_mentioned = NEW.sender_id THEN
      CONTINUE;
    END IF;

    IF NOT public.user_can_access_project(v_project_id) THEN
      CONTINUE;
    END IF;

    INSERT INTO public.chat_message_mentions (message_id, mentioned_user_id, mention_login)
    VALUES (NEW.id, v_mentioned, v_handle)
    ON CONFLICT DO NOTHING;

    v_link := CASE
      WHEN EXISTS (
        SELECT 1
        FROM public.client_customer_access cca
        WHERE cca.user_id = v_mentioned
          AND cca.customer_id = v_customer_id
      ) THEN '/app/client/chat'
      ELSE '/app/chat?project=' || v_project_id::text
    END;

    INSERT INTO public.user_notifications (
      user_id,
      dedupe_key,
      title,
      body,
      link,
      severity
    )
    VALUES (
      v_mentioned,
      'chat-mention-' || NEW.id::text || '-' || v_mentioned::text,
      'มีการกล่าวถึงคุณในแชท: ' || COALESCE(v_project_name, v_brand),
      LEFT(TRIM(NEW.body), 120),
      v_link,
      'info'
    )
    ON CONFLICT (user_id, dedupe_key) DO UPDATE
      SET
        title = EXCLUDED.title,
        body = EXCLUDED.body,
        link = EXCLUDED.link,
        read_at = NULL,
        updated_at = NOW();
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS chat_messages_process_mentions ON public.chat_messages;

CREATE TRIGGER chat_messages_process_mentions
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.process_chat_message_mentions();

-- ── Mention candidates for autocomplete ──
CREATE OR REPLACE FUNCTION public.list_chat_mention_candidates(p_project_id UUID)
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

  IF NOT public.user_can_access_project(p_project_id) THEN
    RAISE EXCEPTION 'project access denied';
  END IF;

  RETURN COALESCE(
    (
      SELECT jsonb_agg(row_data ORDER BY sort_key)
      FROM (
        SELECT DISTINCT ON (p.id)
          jsonb_build_object(
            'user_id', p.id,
            'login_id', p.login_id,
            'full_name', COALESCE(p.full_name, p.email),
            'role_hint', CASE
              WHEN p.id = pr.account_owner_id THEN 'Account'
              WHEN p.id = pr.ads_owner_id THEN 'Ads'
              WHEN p.id = c.sales_owner_id THEN 'Sales'
              ELSE 'ทีม'
            END
          ) AS row_data,
          lower(COALESCE(p.full_name, p.login_id, p.email)) AS sort_key
        FROM public.projects pr
        INNER JOIN public.customers c ON c.id = pr.customer_id
        INNER JOIN public.profiles p ON p.is_active = TRUE
        LEFT JOIN public.user_roles ur ON ur.user_id = p.id
        WHERE pr.id = p_project_id
          AND (
            p.id IN (pr.account_owner_id, pr.ads_owner_id, c.account_owner_id, c.ads_owner_id, c.sales_owner_id)
            OR ur.role IS NOT NULL AND ur.role <> 'client'::public.app_role
            OR EXISTS (
              SELECT 1
              FROM public.client_customer_access cca
              WHERE cca.customer_id = c.id
                AND cca.user_id = p.id
            )
          )
          AND p.id IS DISTINCT FROM auth.uid()
      ) sub
    ),
    '[]'::jsonb
  );
END;
$$;

-- ── Read receipts for room ──
CREATE OR REPLACE FUNCTION public.get_chat_read_receipts(p_room_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT r.project_id INTO v_project_id
  FROM public.chat_rooms r
  WHERE r.id = p_room_id;

  IF v_project_id IS NULL OR NOT public.user_can_access_project(v_project_id) THEN
    RAISE EXCEPTION 'chat room access denied';
  END IF;

  RETURN COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'user_id', rr.user_id,
          'login_id', p.login_id,
          'full_name', COALESCE(p.full_name, p.email),
          'last_read_at', rr.last_read_at
        )
        ORDER BY rr.last_read_at DESC
      )
      FROM public.chat_room_reads rr
      INNER JOIN public.profiles p ON p.id = rr.user_id
      WHERE rr.room_id = p_room_id
        AND rr.user_id IS DISTINCT FROM auth.uid()
        AND p.is_active = TRUE
    ),
    '[]'::jsonb
  );
END;
$$;

-- ── Pinned list ──
CREATE OR REPLACE FUNCTION public.list_chat_pinned_messages(p_room_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_id UUID;
BEGIN
  SELECT r.project_id INTO v_project_id
  FROM public.chat_rooms r
  WHERE r.id = p_room_id;

  IF v_project_id IS NULL OR NOT public.user_can_access_project(v_project_id) THEN
    RAISE EXCEPTION 'chat room access denied';
  END IF;

  RETURN COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'pin_id', pin.id,
          'message_id', m.id,
          'body', m.body,
          'message_type', m.message_type,
          'pinned_at', pin.pinned_at,
          'pinned_by_name', COALESCE(pb.full_name, pb.login_id)
        )
        ORDER BY pin.pinned_at DESC
      )
      FROM public.chat_pinned_messages pin
      INNER JOIN public.chat_messages m ON m.id = pin.message_id
      LEFT JOIN public.profiles pb ON pb.id = pin.pinned_by
      WHERE pin.room_id = p_room_id
    ),
    '[]'::jsonb
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.pin_chat_message(p_room_id UUID, p_message_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT r.project_id INTO v_project_id
  FROM public.chat_rooms r
  INNER JOIN public.chat_messages m ON m.room_id = r.id
  WHERE r.id = p_room_id
    AND m.id = p_message_id;

  IF v_project_id IS NULL OR NOT public.user_can_access_project(v_project_id) THEN
    RAISE EXCEPTION 'access denied';
  END IF;

  INSERT INTO public.chat_pinned_messages (room_id, message_id, pinned_by)
  VALUES (p_room_id, p_message_id, auth.uid())
  ON CONFLICT (room_id, message_id) DO UPDATE
    SET pinned_by = auth.uid(), pinned_at = NOW();
END;
$$;

CREATE OR REPLACE FUNCTION public.unpin_chat_message(p_room_id UUID, p_message_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_id UUID;
BEGIN
  SELECT r.project_id INTO v_project_id
  FROM public.chat_rooms r
  WHERE r.id = p_room_id;

  IF v_project_id IS NULL OR NOT public.user_can_access_project(v_project_id) THEN
    RAISE EXCEPTION 'access denied';
  END IF;

  DELETE FROM public.chat_pinned_messages
  WHERE room_id = p_room_id
    AND message_id = p_message_id;
END;
$$;

-- ── Reactions for room ──
CREATE OR REPLACE FUNCTION public.list_chat_room_reactions(p_room_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_id UUID;
BEGIN
  SELECT r.project_id INTO v_project_id
  FROM public.chat_rooms r
  WHERE r.id = p_room_id;

  IF v_project_id IS NULL OR NOT public.user_can_access_project(v_project_id) THEN
    RAISE EXCEPTION 'access denied';
  END IF;

  RETURN COALESCE(
    (
      SELECT jsonb_object_agg(
        message_id::text,
        reactions
      )
      FROM (
        SELECT
          cr.message_id,
          jsonb_agg(
            jsonb_build_object(
              'emoji', cr.emoji,
              'user_id', cr.user_id,
              'login_id', p.login_id,
              'full_name', COALESCE(p.full_name, p.login_id)
            )
            ORDER BY cr.created_at
          ) AS reactions
        FROM public.chat_message_reactions cr
        INNER JOIN public.chat_messages m ON m.id = cr.message_id
        INNER JOIN public.profiles p ON p.id = cr.user_id
        WHERE m.room_id = p_room_id
        GROUP BY cr.message_id
      ) sub
    ),
    '{}'::jsonb
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.toggle_chat_reaction(p_message_id UUID, p_emoji TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room_id UUID;
  v_project_id UUID;
  v_added BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_emoji NOT IN ('👍', '✅', '❤️', '😂', '🙏') THEN
    RAISE EXCEPTION 'invalid emoji';
  END IF;

  SELECT m.room_id, r.project_id
  INTO v_room_id, v_project_id
  FROM public.chat_messages m
  INNER JOIN public.chat_rooms r ON r.id = m.room_id
  WHERE m.id = p_message_id;

  IF v_project_id IS NULL OR NOT public.user_can_access_project(v_project_id) THEN
    RAISE EXCEPTION 'access denied';
  END IF;

  DELETE FROM public.chat_message_reactions
  WHERE message_id = p_message_id
    AND user_id = auth.uid()
    AND emoji = p_emoji;

  IF FOUND THEN
    RETURN FALSE;
  END IF;

  INSERT INTO public.chat_message_reactions (message_id, user_id, emoji)
  VALUES (p_message_id, auth.uid(), p_emoji);

  RETURN TRUE;
END;
$$;

-- ── Templates list ──
CREATE OR REPLACE FUNCTION public.list_chat_message_templates()
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', t.id,
        'label', t.label,
        'body', t.body,
        'sort_order', t.sort_order,
        'is_active', t.is_active
      )
      ORDER BY t.sort_order, t.label
    ),
    '[]'::jsonb
  )
  FROM public.chat_message_templates t
  WHERE t.is_active = TRUE;
$$;

REVOKE ALL ON FUNCTION public.list_chat_mention_candidates FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_chat_read_receipts FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_chat_pinned_messages FROM PUBLIC;
REVOKE ALL ON FUNCTION public.pin_chat_message FROM PUBLIC;
REVOKE ALL ON FUNCTION public.unpin_chat_message FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_chat_room_reactions FROM PUBLIC;
REVOKE ALL ON FUNCTION public.toggle_chat_reaction FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_chat_message_templates FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.list_chat_mention_candidates(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_chat_read_receipts(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_chat_pinned_messages(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pin_chat_message(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unpin_chat_message(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_chat_room_reactions(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_chat_reaction(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_chat_message_templates() TO authenticated;
