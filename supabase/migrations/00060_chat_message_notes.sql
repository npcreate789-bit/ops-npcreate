-- โน้ตภายในทีมต่อข้อความ (ลูกค้าไม่เห็น)

CREATE OR REPLACE FUNCTION public.user_can_view_chat_internal_notes()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
    AND (
      public.is_privileged()
      OR EXISTS (
        SELECT 1
        FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
          AND ur.role <> 'client'::public.app_role
      )
    );
$$;

CREATE TABLE IF NOT EXISTS public.chat_message_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.chat_messages (id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(trim(body)) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS chat_message_notes_message_idx
  ON public.chat_message_notes (message_id, created_at ASC);

CREATE TRIGGER chat_message_notes_set_updated_at
  BEFORE UPDATE ON public.chat_message_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.chat_message_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS chat_message_notes_select ON public.chat_message_notes;

CREATE POLICY chat_message_notes_select ON public.chat_message_notes
  FOR SELECT TO authenticated
  USING (
    public.user_can_view_chat_internal_notes()
    AND EXISTS (
      SELECT 1
      FROM public.chat_messages m
      INNER JOIN public.chat_rooms r ON r.id = m.room_id
      WHERE m.id = chat_message_notes.message_id
        AND public.user_can_access_project(r.project_id)
    )
  );

DROP POLICY IF EXISTS chat_message_notes_insert ON public.chat_message_notes;

CREATE POLICY chat_message_notes_insert ON public.chat_message_notes
  FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND public.user_can_view_chat_internal_notes()
    AND EXISTS (
      SELECT 1
      FROM public.chat_messages m
      INNER JOIN public.chat_rooms r ON r.id = m.room_id
      WHERE m.id = chat_message_notes.message_id
        AND public.user_can_access_project(r.project_id)
    )
  );

DROP POLICY IF EXISTS chat_message_notes_update ON public.chat_message_notes;

CREATE POLICY chat_message_notes_update ON public.chat_message_notes
  FOR UPDATE TO authenticated
  USING (
    public.user_can_view_chat_internal_notes()
    AND (author_id = auth.uid() OR public.is_privileged())
  )
  WITH CHECK (author_id = auth.uid() OR public.is_privileged());

DROP POLICY IF EXISTS chat_message_notes_delete ON public.chat_message_notes;

CREATE POLICY chat_message_notes_delete ON public.chat_message_notes
  FOR DELETE TO authenticated
  USING (
    public.user_can_view_chat_internal_notes()
    AND (author_id = auth.uid() OR public.is_privileged())
  );

CREATE OR REPLACE FUNCTION public.list_chat_room_notes(p_room_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_id UUID;
  v_result JSONB := '{}'::jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.user_can_view_chat_internal_notes() THEN
    RETURN '{}'::jsonb;
  END IF;

  SELECT r.project_id INTO v_project_id
  FROM public.chat_rooms r
  WHERE r.id = p_room_id;

  IF v_project_id IS NULL OR NOT public.user_can_access_project(v_project_id) THEN
    RAISE EXCEPTION 'chat room access denied';
  END IF;

  SELECT COALESCE(
    jsonb_object_agg(sub.message_id::text, sub.notes),
    '{}'::jsonb
  )
  INTO v_result
  FROM (
    SELECT
      n.message_id,
      jsonb_agg(
        jsonb_build_object(
          'id', n.id,
          'message_id', n.message_id,
          'author_id', n.author_id,
          'author_name', COALESCE(p.full_name, p.email),
          'body', n.body,
          'created_at', n.created_at,
          'updated_at', n.updated_at
        )
        ORDER BY n.created_at ASC
      ) AS notes
    FROM public.chat_message_notes n
    INNER JOIN public.chat_messages m ON m.id = n.message_id
    INNER JOIN public.profiles p ON p.id = n.author_id
    WHERE m.room_id = p_room_id
    GROUP BY n.message_id
  ) sub;

  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.save_chat_message_note(
  p_message_id UUID,
  p_body TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room_id UUID;
  v_project_id UUID;
  v_note_id UUID;
  v_trimmed TEXT;
BEGIN
  IF auth.uid() IS NULL OR NOT public.user_can_view_chat_internal_notes() THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  v_trimmed := trim(p_body);
  IF char_length(v_trimmed) < 1 THEN
    RAISE EXCEPTION 'note body required';
  END IF;

  SELECT m.room_id, r.project_id
  INTO v_room_id, v_project_id
  FROM public.chat_messages m
  INNER JOIN public.chat_rooms r ON r.id = m.room_id
  WHERE m.id = p_message_id;

  IF v_project_id IS NULL OR NOT public.user_can_access_project(v_project_id) THEN
    RAISE EXCEPTION 'message access denied';
  END IF;

  INSERT INTO public.chat_message_notes (message_id, author_id, body)
  VALUES (p_message_id, auth.uid(), v_trimmed)
  RETURNING id INTO v_note_id;

  RETURN (
    SELECT jsonb_build_object(
      'id', n.id,
      'message_id', n.message_id,
      'author_id', n.author_id,
      'author_name', COALESCE(p.full_name, p.email),
      'body', n.body,
      'created_at', n.created_at,
      'updated_at', n.updated_at
    )
    FROM public.chat_message_notes n
    INNER JOIN public.profiles p ON p.id = n.author_id
    WHERE n.id = v_note_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_chat_message_note(p_note_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.user_can_view_chat_internal_notes() THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  DELETE FROM public.chat_message_notes n
  WHERE n.id = p_note_id
    AND (
      n.author_id = auth.uid()
      OR public.is_privileged()
    );

  IF NOT FOUND THEN
    RAISE EXCEPTION 'note not found or access denied';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.user_can_view_chat_internal_notes() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_chat_room_notes(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_chat_message_note(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_chat_message_note(UUID) TO authenticated;
