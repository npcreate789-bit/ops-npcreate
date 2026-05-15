-- Phase 2 / Sprint 11: พอร์ทัลลูกค้า + ลิงก์บัญชี client ↔ customer

CREATE TABLE public.client_customer_access (
  user_id UUID PRIMARY KEY REFERENCES public.profiles (id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX client_customer_access_customer_id_idx
  ON public.client_customer_access (customer_id);

ALTER TABLE public.client_customer_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY client_access_select ON public.client_customer_access
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_privileged()
    OR public.has_role('admin')
  );

CREATE POLICY client_access_manage ON public.client_customer_access
  FOR ALL TO authenticated
  USING (public.is_privileged())
  WITH CHECK (public.is_privileged());

CREATE OR REPLACE FUNCTION public.my_client_customer_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT customer_id
  FROM public.client_customer_access
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.my_client_customer_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.my_client_customer_id() TO authenticated;

-- ลูกค้าอ่านแบรนด์ของตัวเอง
CREATE POLICY customers_select_client ON public.customers
  FOR SELECT TO authenticated
  USING (
    public.has_role('client')
    AND id = public.my_client_customer_id()
  );

-- บรีฟ onboarding (อ่านอย่างเดียว)
CREATE POLICY onboarding_forms_select_client ON public.onboarding_forms
  FOR SELECT TO authenticated
  USING (
    public.has_role('client')
    AND customer_id = public.my_client_customer_id()
  );

CREATE POLICY onboarding_checklist_select_client ON public.onboarding_checklist
  FOR SELECT TO authenticated
  USING (
    public.has_role('client')
    AND customer_id = public.my_client_customer_id()
  );

-- แคมเปญ + รายงานย้อนหลัง
CREATE POLICY campaigns_select_client ON public.campaigns
  FOR SELECT TO authenticated
  USING (
    public.has_role('client')
    AND customer_id = public.my_client_customer_id()
  );

CREATE POLICY daily_metrics_select_client ON public.daily_metrics
  FOR SELECT TO authenticated
  USING (
    public.has_role('client')
    AND EXISTS (
      SELECT 1
      FROM public.campaigns c
      WHERE c.id = campaign_id
        AND c.customer_id = public.my_client_customer_id()
    )
  );

-- คอนเทนต์ที่ส่งมอบแล้วเท่านั้น
CREATE POLICY content_jobs_select_client ON public.content_jobs
  FOR SELECT TO authenticated
  USING (
    public.has_role('client')
    AND status = 'delivered'
    AND customer_id = public.my_client_customer_id()
  );
