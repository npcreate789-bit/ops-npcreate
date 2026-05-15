-- เวลารายงาน (เวลาส่งจริงบันทึกจากแอป)

ALTER TABLE public.daily_metrics
  ADD COLUMN IF NOT EXISTS reported_at TIMESTAMPTZ;

COMMENT ON COLUMN public.daily_metrics.reported_at IS
  'เวลาที่ส่งรายงานจริง (timestamptz)';
