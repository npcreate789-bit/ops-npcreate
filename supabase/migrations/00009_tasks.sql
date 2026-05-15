-- Sprint 7 — Internal task management

CREATE TYPE public.task_status AS ENUM ('todo', 'in_progress', 'blocked', 'done');

CREATE TYPE public.task_priority AS ENUM ('low', 'medium', 'high', 'urgent');

CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status public.task_status NOT NULL DEFAULT 'todo',
  priority public.task_priority NOT NULL DEFAULT 'medium',
  assignee_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  created_by UUID NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  customer_id UUID REFERENCES public.customers (id) ON DELETE SET NULL,
  lead_id UUID REFERENCES public.leads (id) ON DELETE SET NULL,
  due_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX tasks_assignee_id_idx ON public.tasks (assignee_id);
CREATE INDEX tasks_status_idx ON public.tasks (status);
CREATE INDEX tasks_due_at_idx ON public.tasks (due_at);
CREATE INDEX tasks_customer_id_idx ON public.tasks (customer_id);

CREATE TRIGGER tasks_set_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.tasks_set_completed_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'done' AND OLD.status IS DISTINCT FROM 'done' THEN
    NEW.completed_at := COALESCE(NEW.completed_at, NOW());
  ELSIF NEW.status IS DISTINCT FROM 'done' THEN
    NEW.completed_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tasks_completed_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.tasks_set_completed_at();

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY tasks_select ON public.tasks
  FOR SELECT TO authenticated
  USING (
    public.is_privileged()
    OR assignee_id = auth.uid()
    OR created_by = auth.uid()
    OR public.has_role('account')
    OR public.has_role('senior_ads')
  );

CREATE POLICY tasks_insert ON public.tasks
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY tasks_update ON public.tasks
  FOR UPDATE TO authenticated
  USING (
    public.is_privileged()
    OR assignee_id = auth.uid()
    OR created_by = auth.uid()
  )
  WITH CHECK (
    public.is_privileged()
    OR assignee_id = auth.uid()
    OR created_by = auth.uid()
  );

CREATE POLICY tasks_delete ON public.tasks
  FOR DELETE TO authenticated
  USING (public.is_privileged() OR created_by = auth.uid());
