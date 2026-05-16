-- ประสิทธิภาพการกรองบันทึกกิจกรรม (พนักงาน / ช่วงเวลา)

CREATE INDEX IF NOT EXISTS audit_logs_actor_created_idx
  ON public.audit_logs (actor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS audit_logs_action_created_idx
  ON public.audit_logs (action, created_at DESC);
