-- NP Create Platform — Projects, public inquiry, client brief write

-- Lead: ลิงก์ร้าน / เพจ (Module 1)
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS shop_links TEXT;

-- ตั้งค่าระบบ (เช่น Sales รับ Lead จากฟอร์มสาธารณะ)
CREATE TABLE IF NOT EXISTS public.platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY platform_settings_select_privileged ON public.platform_settings
  FOR SELECT TO authenticated
  USING (public.is_privileged());

CREATE POLICY platform_settings_manage_privileged ON public.platform_settings
  FOR ALL TO authenticated
  USING (public.is_privileged())
  WITH CHECK (public.is_privileged());

-- Projects (Module 5)
CREATE TYPE public.project_status AS ENUM (
  'onboarding',
  'waiting_brief',
  'planning',
  'in_progress',
  'waiting_approval',
  'completed',
  'renewal',
  'closed'
);

CREATE TYPE public.project_service_type AS ENUM (
  'GMV_MAX',
  'CONTENT',
  'TIKTOK_ONE',
  'LIVE',
  'CONSULTING',
  'COURSE',
  'SOFTWARE',
  'OTHER'
);

CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers (id) ON DELETE CASCADE,
  project_name TEXT NOT NULL,
  service_type public.project_service_type NOT NULL DEFAULT 'GMV_MAX',
  status public.project_status NOT NULL DEFAULT 'onboarding',
  start_date DATE,
  end_date DATE,
  progress SMALLINT NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  account_owner_id UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  ads_owner_id UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX projects_customer_id_idx ON public.projects (customer_id);
CREATE INDEX projects_status_idx ON public.projects (status);

CREATE TRIGGER projects_set_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY projects_select ON public.projects
  FOR SELECT TO authenticated
  USING (
    public.is_privileged()
    OR public.has_any_role(ARRAY['account', 'admin']::public.app_role[])
    OR account_owner_id = auth.uid()
    OR ads_owner_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.customers c
      WHERE c.id = customer_id
        AND (
          c.account_owner_id = auth.uid()
          OR c.ads_owner_id = auth.uid()
          OR c.sales_owner_id = auth.uid()
        )
    )
    OR (
      public.has_role('client')
      AND customer_id = public.my_client_customer_id()
    )
  );

CREATE POLICY projects_insert ON public.projects
  FOR INSERT TO authenticated
  WITH CHECK (public.is_privileged() OR public.has_any_role(ARRAY['operations', 'account']::public.app_role[]));

CREATE POLICY projects_update ON public.projects
  FOR UPDATE TO authenticated
  USING (
    public.is_privileged()
    OR public.has_any_role(ARRAY['operations', 'account']::public.app_role[])
    OR account_owner_id = auth.uid()
  )
  WITH CHECK (
    public.is_privileged()
    OR public.has_any_role(ARRAY['operations', 'account']::public.app_role[])
    OR account_owner_id = auth.uid()
  );

CREATE POLICY projects_delete ON public.projects
  FOR DELETE TO authenticated
  USING (public.is_privileged());

-- ลูกค้าแก้บรีฟของตนเองได้
CREATE POLICY onboarding_forms_update_client ON public.onboarding_forms
  FOR UPDATE TO authenticated
  USING (
    public.has_role('client')
    AND customer_id = public.my_client_customer_id()
  )
  WITH CHECK (
    public.has_role('client')
    AND customer_id = public.my_client_customer_id()
  );

-- ฟอร์มติดต่อสาธารณะ → Lead (anon ผ่าน RPC เท่านั้น)
CREATE OR REPLACE FUNCTION public.submit_public_inquiry(
  p_brand_name TEXT,
  p_contact_name TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_line_id TEXT DEFAULT NULL,
  p_facebook TEXT DEFAULT NULL,
  p_business_type TEXT DEFAULT NULL,
  p_services_interested TEXT[] DEFAULT '{}',
  p_pain_points TEXT DEFAULT NULL,
  p_ad_budget_monthly NUMERIC DEFAULT NULL,
  p_shop_links TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner UUID;
  v_lead_id UUID;
BEGIN
  IF NULLIF(TRIM(p_brand_name), '') IS NULL THEN
    RAISE EXCEPTION 'brand_name is required';
  END IF;

  SELECT (value #>> '{}')::UUID
  INTO v_owner
  FROM public.platform_settings
  WHERE key = 'default_lead_owner_id';

  IF v_owner IS NULL THEN
    SELECT ur.user_id
    INTO v_owner
    FROM public.user_roles ur
    WHERE ur.role = 'sales'
    ORDER BY ur.created_at
    LIMIT 1;
  END IF;

  IF v_owner IS NULL THEN
    SELECT id INTO v_owner FROM public.profiles WHERE is_active LIMIT 1;
  END IF;

  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'no lead owner configured';
  END IF;

  INSERT INTO public.leads (
    owner_id,
    brand_name,
    contact_name,
    phone,
    line_id,
    facebook,
    business_type,
    ad_budget_monthly,
    pain_points,
    services_interested,
    status,
    channel,
    shop_links,
    notes
  )
  VALUES (
    v_owner,
    TRIM(p_brand_name),
    NULLIF(TRIM(p_contact_name), ''),
    NULLIF(TRIM(p_phone), ''),
    NULLIF(TRIM(p_line_id), ''),
    NULLIF(TRIM(p_facebook), ''),
    NULLIF(TRIM(p_business_type), ''),
    p_ad_budget_monthly,
    NULLIF(TRIM(p_pain_points), ''),
    COALESCE(p_services_interested, '{}'),
    'interested',
    'website',
    NULLIF(TRIM(p_shop_links), ''),
    NULLIF(TRIM(p_notes), '')
  )
  RETURNING id INTO v_lead_id;

  RETURN v_lead_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_public_inquiry FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_public_inquiry TO anon, authenticated;
