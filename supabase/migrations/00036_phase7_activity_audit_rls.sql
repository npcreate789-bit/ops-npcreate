-- Phase 7: ให้ Operations / Account / Admin อ่าน audit log (ยัง insert ผ่าน log_audit เท่านั้น)

CREATE POLICY audit_logs_select_ops ON public.audit_logs
  FOR SELECT TO authenticated
  USING (
    public.has_any_role(ARRAY['operations', 'account', 'admin']::public.app_role[])
  );
