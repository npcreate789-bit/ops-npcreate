-- Sprint: Group Chat ต่อโปรเจกต์

CREATE TABLE IF NOT EXISTS public.chat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL UNIQUE REFERENCES public.projects (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS chat_rooms_project_id_idx ON public.chat_rooms (project_id);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.chat_rooms (id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  body TEXT NOT NULL,
  created_task_id UUID REFERENCES public.tasks (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chat_messages_body_len CHECK (char_length(trim(body)) BETWEEN 1 AND 4000)
);

CREATE INDEX IF NOT EXISTS chat_messages_room_created_idx
  ON public.chat_messages (room_id, created_at DESC);

CREATE TRIGGER chat_rooms_set_updated_at
  BEFORE UPDATE ON public.chat_rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.user_can_access_project(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.projects pr
    WHERE pr.id = p_project_id
      AND (
        public.is_privileged()
        OR public.has_any_role(ARRAY['account', 'admin', 'operations']::public.app_role[])
        OR pr.account_owner_id = auth.uid()
        OR pr.ads_owner_id = auth.uid()
        OR EXISTS (
          SELECT 1
          FROM public.customers c
          WHERE c.id = pr.customer_id
            AND (
              c.account_owner_id = auth.uid()
              OR c.ads_owner_id = auth.uid()
              OR c.sales_owner_id = auth.uid()
            )
        )
        OR (
          public.has_role('client')
          AND pr.customer_id = public.my_client_customer_id()
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.ensure_project_chat_room(p_project_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room_id UUID;
BEGIN
  IF NOT public.user_can_access_project(p_project_id) THEN
    RAISE EXCEPTION 'project access denied';
  END IF;

  INSERT INTO public.chat_rooms (project_id)
  VALUES (p_project_id)
  ON CONFLICT (project_id) DO NOTHING;

  SELECT id INTO v_room_id
  FROM public.chat_rooms
  WHERE project_id = p_project_id;

  RETURN v_room_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.touch_chat_room_on_message()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.chat_rooms
  SET updated_at = NOW()
  WHERE id = NEW.room_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS chat_messages_touch_room ON public.chat_messages;

CREATE TRIGGER chat_messages_touch_room
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_chat_room_on_message();

ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY chat_rooms_select ON public.chat_rooms
  FOR SELECT TO authenticated
  USING (public.user_can_access_project(project_id));

CREATE POLICY chat_messages_select ON public.chat_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.chat_rooms r
      WHERE r.id = room_id
        AND public.user_can_access_project(r.project_id)
    )
  );

CREATE POLICY chat_messages_insert ON public.chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.chat_rooms r
      WHERE r.id = room_id
        AND public.user_can_access_project(r.project_id)
    )
  );

CREATE POLICY chat_messages_update ON public.chat_messages
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.chat_rooms r
      WHERE r.id = room_id
        AND public.user_can_access_project(r.project_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.chat_rooms r
      WHERE r.id = room_id
        AND public.user_can_access_project(r.project_id)
    )
  );

ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

REVOKE ALL ON FUNCTION public.user_can_access_project FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ensure_project_chat_room FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_project_chat_room TO authenticated;
