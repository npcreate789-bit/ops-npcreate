-- Sprint 6 — Ads: campaigns & daily metrics

CREATE TYPE public.campaign_status AS ENUM (
  'active',
  'budget_unused',
  'low_roi',
  'needs_fix',
  'paused'
);

CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers (id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  product_link TEXT,
  price NUMERIC(12, 2),
  promotion TEXT,
  cost NUMERIC(12, 2),
  commission TEXT,
  target_roi NUMERIC(8, 2),
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers (id) ON DELETE CASCADE,
  ads_owner_id UUID NOT NULL REFERENCES public.profiles (id),
  name TEXT NOT NULL DEFAULT 'แคมเปญหลัก',
  campaign_type TEXT NOT NULL DEFAULT 'gmv_max',
  daily_budget NUMERIC(12, 2),
  status public.campaign_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.daily_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns (id) ON DELETE CASCADE,
  report_date DATE NOT NULL,
  spend NUMERIC(12, 2) NOT NULL DEFAULT 0,
  gmv NUMERIC(12, 2) NOT NULL DEFAULT 0,
  orders INT NOT NULL DEFAULT 0,
  roi NUMERIC(10, 4),
  cpa NUMERIC(12, 2),
  top_product TEXT,
  top_video TEXT,
  issue TEXT,
  next_plan TEXT,
  report_submitted BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID NOT NULL REFERENCES public.profiles (id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (campaign_id, report_date)
);

CREATE INDEX campaigns_customer_id_idx ON public.campaigns (customer_id);
CREATE INDEX campaigns_ads_owner_id_idx ON public.campaigns (ads_owner_id);
CREATE INDEX daily_metrics_report_date_idx ON public.daily_metrics (report_date DESC);
CREATE INDEX products_customer_id_idx ON public.products (customer_id);

CREATE TRIGGER products_set_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER campaigns_set_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER daily_metrics_set_updated_at
  BEFORE UPDATE ON public.daily_metrics
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.ensure_default_campaign(
  p_customer_id UUID,
  p_ads_owner_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  SELECT id INTO v_id FROM public.campaigns WHERE customer_id = p_customer_id LIMIT 1;
  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;

  INSERT INTO public.campaigns (customer_id, ads_owner_id, name)
  VALUES (p_customer_id, p_ads_owner_id, 'แคมเปญหลัก')
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY products_select ON public.products
  FOR SELECT TO authenticated
  USING (
    public.is_privileged()
    OR public.has_role('account')
    OR public.has_role('ads')
    OR public.has_role('senior_ads')
  );

CREATE POLICY products_mutate ON public.products
  FOR ALL TO authenticated
  USING (public.is_privileged() OR public.has_role('account'))
  WITH CHECK (public.is_privileged() OR public.has_role('account'));

CREATE POLICY campaigns_select ON public.campaigns
  FOR SELECT TO authenticated
  USING (
    public.is_privileged()
    OR ads_owner_id = auth.uid()
    OR public.has_role('senior_ads')
    OR public.has_role('account')
  );

CREATE POLICY campaigns_insert ON public.campaigns
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_privileged()
    OR (ads_owner_id = auth.uid() AND public.has_any_role(ARRAY['ads', 'senior_ads']::public.app_role[]))
  );

CREATE POLICY campaigns_update ON public.campaigns
  FOR UPDATE TO authenticated
  USING (public.is_privileged() OR ads_owner_id = auth.uid())
  WITH CHECK (public.is_privileged() OR ads_owner_id = auth.uid());

CREATE POLICY daily_metrics_select ON public.daily_metrics
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_id
        AND (
          public.is_privileged()
          OR c.ads_owner_id = auth.uid()
          OR public.has_role('account')
          OR public.has_role('senior_ads')
        )
    )
  );

CREATE POLICY daily_metrics_insert ON public.daily_metrics
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_id
        AND (public.is_privileged() OR c.ads_owner_id = auth.uid())
    )
  );

CREATE POLICY daily_metrics_update ON public.daily_metrics
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_id
        AND (public.is_privileged() OR c.ads_owner_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_id
        AND (public.is_privileged() OR c.ads_owner_id = auth.uid())
    )
  );

GRANT EXECUTE ON FUNCTION public.ensure_default_campaign(UUID, UUID) TO authenticated;
