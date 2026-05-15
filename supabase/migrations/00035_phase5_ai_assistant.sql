-- Phase 5 / Sprint 16–17: บันทึกการใช้ผู้ช่วย AI (ไม่เก็บข้อความเต็ม — audit เบา)

CREATE TABLE public.assistant_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  audience TEXT NOT NULL CHECK (audience IN ('staff', 'client')),
  prompt_key TEXT NOT NULL,
  customer_id UUID REFERENCES public.customers (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX assistant_usage_logs_user_idx ON public.assistant_usage_logs (user_id, created_at DESC);

ALTER TABLE public.assistant_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY assistant_usage_logs_select ON public.assistant_usage_logs
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_privileged());

CREATE POLICY assistant_usage_logs_insert ON public.assistant_usage_logs
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
