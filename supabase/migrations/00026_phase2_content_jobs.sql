-- Phase 2 / Sprint 10: งานผลิตคอนเทนต์

CREATE TYPE public.content_job_status AS ENUM (
  'briefed',
  'in_production',
  'review',
  'delivered',
  'cancelled'
);

CREATE TYPE public.content_format AS ENUM (
  'short_clip',
  'live_clip',
  'graphic',
  'ugc',
  'other'
);

CREATE TABLE public.content_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  brief TEXT,
  format public.content_format NOT NULL DEFAULT 'short_clip',
  status public.content_job_status NOT NULL DEFAULT 'briefed',
  assignee_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  created_by UUID NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  deliverable_url TEXT,
  due_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX content_jobs_customer_id_idx ON public.content_jobs (customer_id);
CREATE INDEX content_jobs_assignee_id_idx ON public.content_jobs (assignee_id);
CREATE INDEX content_jobs_status_idx ON public.content_jobs (status);
CREATE INDEX content_jobs_due_at_idx ON public.content_jobs (due_at);

CREATE TRIGGER content_jobs_set_updated_at
  BEFORE UPDATE ON public.content_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.content_jobs_set_delivered_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'delivered' AND OLD.status IS DISTINCT FROM 'delivered' THEN
    NEW.delivered_at := COALESCE(NEW.delivered_at, NOW());
  ELSIF NEW.status IS DISTINCT FROM 'delivered' THEN
    NEW.delivered_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER content_jobs_delivered_at
  BEFORE UPDATE ON public.content_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.content_jobs_set_delivered_at();

ALTER TABLE public.content_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY content_jobs_select ON public.content_jobs
  FOR SELECT TO authenticated
  USING (
    public.is_privileged()
    OR public.has_role('admin')
    OR assignee_id = auth.uid()
    OR created_by = auth.uid()
    OR public.has_role('account')
    OR public.has_role('content')
  );

CREATE POLICY content_jobs_insert ON public.content_jobs
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND (
      public.is_privileged()
      OR public.has_role('content')
      OR public.has_role('account')
    )
  );

CREATE POLICY content_jobs_update ON public.content_jobs
  FOR UPDATE TO authenticated
  USING (
    public.is_privileged()
    OR assignee_id = auth.uid()
    OR created_by = auth.uid()
    OR public.has_role('account')
  )
  WITH CHECK (
    public.is_privileged()
    OR assignee_id = auth.uid()
    OR created_by = auth.uid()
    OR public.has_role('account')
  );

CREATE POLICY content_jobs_delete ON public.content_jobs
  FOR DELETE TO authenticated
  USING (public.is_privileged() OR created_by = auth.uid());

-- profiles: content team อ่านรายชื่อมอบหมาย
DROP POLICY IF EXISTS profiles_select ON public.profiles;

CREATE POLICY profiles_select ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR public.is_privileged()
    OR is_active = TRUE
    OR public.has_any_role(
      ARRAY[
        'account',
        'admin',
        'operations',
        'sales',
        'ads',
        'senior_ads',
        'content'
      ]::public.app_role[]
    )
  );
