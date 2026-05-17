-- Sprint: ผูกงานกับโปรเจกต์ (Project ↔ Task)

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS tasks_project_id_idx ON public.tasks (project_id);

CREATE OR REPLACE FUNCTION public.tasks_sync_customer_from_project()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.project_id IS NOT NULL THEN
    SELECT p.customer_id
    INTO NEW.customer_id
    FROM public.projects p
    WHERE p.id = NEW.project_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tasks_sync_customer_from_project ON public.tasks;

CREATE TRIGGER tasks_sync_customer_from_project
  BEFORE INSERT OR UPDATE OF project_id ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.tasks_sync_customer_from_project();

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
    OR (
      project_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.projects p
        WHERE p.id = project_id
          AND (
            p.account_owner_id = auth.uid()
            OR p.ads_owner_id = auth.uid()
            OR EXISTS (
              SELECT 1
              FROM public.customers c
              WHERE c.id = p.customer_id
                AND (
                  c.account_owner_id = auth.uid()
                  OR c.ads_owner_id = auth.uid()
                  OR c.sales_owner_id = auth.uid()
                )
            )
            OR (
              public.has_role('client')
              AND p.customer_id = public.my_client_customer_id()
            )
          )
      )
    )
  );
