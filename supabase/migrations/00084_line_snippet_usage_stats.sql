-- Phase 3: สถิติการใช้ชุดข้อความจากแชท CRM

ALTER TABLE public.line_message_snippets
  ADD COLUMN IF NOT EXISTS use_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ;

ALTER TABLE public.line_message_snippets
  DROP CONSTRAINT IF EXISTS line_message_snippets_use_count_check;

ALTER TABLE public.line_message_snippets
  ADD CONSTRAINT line_message_snippets_use_count_check
  CHECK (use_count >= 0);

CREATE INDEX IF NOT EXISTS line_message_snippets_use_count_idx
  ON public.line_message_snippets (use_count DESC, last_used_at DESC NULLS LAST);

CREATE OR REPLACE FUNCTION public.record_line_snippet_use(p_snippet_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.line_message_snippets
  SET
    use_count = use_count + 1,
    last_used_at = NOW()
  WHERE id = p_snippet_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_line_snippet_use(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_line_snippet_use(UUID) TO authenticated;
