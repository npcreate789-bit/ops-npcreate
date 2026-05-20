-- Phase 2: ช่วงวันที่โปรโมชั่น / ข้อความตามกำหนด

ALTER TABLE public.line_message_snippets
  ADD COLUMN IF NOT EXISTS valid_from DATE,
  ADD COLUMN IF NOT EXISTS valid_until DATE;

ALTER TABLE public.line_message_snippets
  DROP CONSTRAINT IF EXISTS line_message_snippets_valid_range_check;

ALTER TABLE public.line_message_snippets
  ADD CONSTRAINT line_message_snippets_valid_range_check
  CHECK (
    valid_from IS NULL
    OR valid_until IS NULL
    OR valid_from <= valid_until
  );

COMMENT ON COLUMN public.line_message_snippets.valid_from IS
  'วันเริ่มแสดง (Bangkok calendar date, inclusive). NULL = ไม่จำกัด';
COMMENT ON COLUMN public.line_message_snippets.valid_until IS
  'วันสิ้นสุดแสดง (Bangkok calendar date, inclusive). NULL = ไม่จำกัด';
