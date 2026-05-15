-- Sprint 7: profiles สำหรับ dropdown มอบหมาย, admin อ่านงานทีม

DROP POLICY IF EXISTS profiles_select_own ON public.profiles;

CREATE POLICY profiles_select ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR public.is_privileged()
    OR public.has_any_role(
      ARRAY['account', 'admin', 'operations', 'sales', 'ads', 'senior_ads']::public.app_role[]
    )
  );

DROP POLICY IF EXISTS tasks_select ON public.tasks;

CREATE POLICY tasks_select ON public.tasks
  FOR SELECT TO authenticated
  USING (
    public.is_privileged()
    OR public.has_role('admin')
    OR assignee_id = auth.uid()
    OR created_by = auth.uid()
    OR public.has_role('account')
    OR public.has_role('senior_ads')
  );
