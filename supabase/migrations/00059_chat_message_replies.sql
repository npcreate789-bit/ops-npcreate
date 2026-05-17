-- ตอบกลับข้อความ (reply-to)

ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES public.chat_messages (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS chat_messages_reply_to_idx
  ON public.chat_messages (reply_to_id)
  WHERE reply_to_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.chat_messages_validate_reply()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_parent_type TEXT;
BEGIN
  IF NEW.reply_to_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT p.message_type
  INTO v_parent_type
  FROM public.chat_messages p
  WHERE p.id = NEW.reply_to_id
    AND p.room_id = NEW.room_id;

  IF v_parent_type IS NULL THEN
    RAISE EXCEPTION 'reply target not found in this room';
  END IF;

  IF v_parent_type = 'system' THEN
    RAISE EXCEPTION 'cannot reply to system message';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS chat_messages_validate_reply_trg ON public.chat_messages;

CREATE TRIGGER chat_messages_validate_reply_trg
  BEFORE INSERT OR UPDATE OF reply_to_id ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.chat_messages_validate_reply();

CREATE OR REPLACE FUNCTION public.send_chat_file_message(
  p_room_id UUID,
  p_storage_path TEXT,
  p_file_name TEXT,
  p_mime_type TEXT DEFAULT NULL,
  p_byte_size BIGINT DEFAULT NULL,
  p_caption TEXT DEFAULT NULL,
  p_reply_to_id UUID DEFAULT NULL
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
    attachment_size,
    reply_to_id
  )
  VALUES (
    p_room_id,
    auth.uid(),
    v_body,
    'file',
    p_storage_path,
    trim(p_file_name),
    NULLIF(trim(p_mime_type), ''),
    p_byte_size,
    p_reply_to_id
  )
  RETURNING id INTO v_message_id;

  RETURN v_message_id;
END;
$$;
