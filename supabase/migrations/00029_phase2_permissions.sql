-- Phase 2: สิทธิ์ content update + staff อ่านแคมเปญ/metrics สำหรับ preview รายงานลูกค้า

CREATE OR REPLACE FUNCTION public.is_client_report_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_privileged()
    OR public.has_any_role(ARRAY['admin', 'account']::public.app_role[]);
$$;

REVOKE ALL ON FUNCTION public.is_client_report_staff() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_client_report_staff() TO authenticated;

DROP POLICY IF EXISTS content_jobs_update ON public.content_jobs;

CREATE POLICY content_jobs_update ON public.content_jobs
  FOR UPDATE TO authenticated
  USING (
    public.is_privileged()
    OR assignee_id = auth.uid()
    OR created_by = auth.uid()
    OR public.has_role('account')
    OR public.has_role('content')
  )
  WITH CHECK (
    public.is_privileged()
    OR assignee_id = auth.uid()
    OR created_by = auth.uid()
    OR public.has_role('account')
    OR public.has_role('content')
  );

CREATE POLICY campaigns_select_report_staff ON public.campaigns
  FOR SELECT TO authenticated
  USING (public.is_client_report_staff());

CREATE POLICY daily_metrics_select_report_staff ON public.daily_metrics
  FOR SELECT TO authenticated
  USING (
    public.is_client_report_staff()
    AND EXISTS (
      SELECT 1 FROM public.campaigns c WHERE c.id = campaign_id
    )
  );
