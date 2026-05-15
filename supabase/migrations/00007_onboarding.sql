-- Sprint 5 — Brand Onboarding

CREATE TYPE public.checklist_value AS ENUM (
  'pending',
  'done',
  'yes',
  'no',
  'ready',
  'needs_fix'
);

CREATE TABLE public.onboarding_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL UNIQUE REFERENCES public.customers (id) ON DELETE CASCADE,
  tiktok_shop_url TEXT,
  product_links TEXT,
  pricing_info TEXT,
  promotion_info TEXT,
  profit_margin TEXT,
  commission_info TEXT,
  target_roi NUMERIC(8, 2),
  daily_ad_budget NUMERIC(12, 2),
  existing_content TEXT,
  ads_account_info TEXT,
  seller_account_info TEXT,
  business_center_info TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.onboarding_checklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers (id) ON DELETE CASCADE,
  item_key TEXT NOT NULL,
  status public.checklist_value NOT NULL DEFAULT 'pending',
  note TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (customer_id, item_key)
);

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS ready_for_ads BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX onboarding_forms_customer_id_idx ON public.onboarding_forms (customer_id);
CREATE INDEX onboarding_checklist_customer_id_idx ON public.onboarding_checklist (customer_id);

CREATE TRIGGER onboarding_forms_set_updated_at
  BEFORE UPDATE ON public.onboarding_forms
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.ensure_onboarding_checklist(p_customer_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.onboarding_checklist (customer_id, item_key, status)
  VALUES
    (p_customer_id, 'shop_link', 'pending'),
    (p_customer_id, 'product_link', 'pending'),
    (p_customer_id, 'pricing', 'pending'),
    (p_customer_id, 'ad_budget', 'pending'),
    (p_customer_id, 'system_access', 'pending'),
    (p_customer_id, 'clips_ready', 'no'),
    (p_customer_id, 'product_page', 'needs_fix'),
    (p_customer_id, 'commission', 'needs_fix')
  ON CONFLICT (customer_id, item_key) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_customer_ready_for_ads(p_customer_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_done INT;
  v_total INT := 8;
BEGIN
  SELECT COUNT(*) INTO v_done
  FROM public.onboarding_checklist c
  WHERE c.customer_id = p_customer_id
    AND (
      (c.item_key IN ('shop_link', 'product_link', 'pricing', 'ad_budget', 'system_access') AND c.status = 'done')
      OR (c.item_key = 'clips_ready' AND c.status = 'yes')
      OR (c.item_key IN ('product_page', 'commission') AND c.status = 'ready')
    );

  UPDATE public.customers
  SET ready_for_ads = (v_done >= v_total), updated_at = NOW()
  WHERE id = p_customer_id;
END;
$$;

ALTER TABLE public.onboarding_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_checklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY onboarding_forms_select ON public.onboarding_forms
  FOR SELECT TO authenticated
  USING (
    public.is_privileged()
    OR public.has_role('account')
    OR public.has_role('admin')
    OR public.has_role('operations')
    OR public.has_role('ads')
  );

CREATE POLICY onboarding_forms_insert ON public.onboarding_forms
  FOR INSERT TO authenticated
  WITH CHECK (public.is_privileged() OR public.has_role('account'));

CREATE POLICY onboarding_forms_update ON public.onboarding_forms
  FOR UPDATE TO authenticated
  USING (public.is_privileged() OR public.has_role('account'))
  WITH CHECK (public.is_privileged() OR public.has_role('account'));

CREATE POLICY onboarding_checklist_select ON public.onboarding_checklist
  FOR SELECT TO authenticated
  USING (
    public.is_privileged()
    OR public.has_role('account')
    OR public.has_role('admin')
    OR public.has_role('operations')
    OR public.has_role('ads')
  );

CREATE POLICY onboarding_checklist_update ON public.onboarding_checklist
  FOR UPDATE TO authenticated
  USING (public.is_privileged() OR public.has_role('account'))
  WITH CHECK (public.is_privileged() OR public.has_role('account'));

GRANT EXECUTE ON FUNCTION public.ensure_onboarding_checklist(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_customer_ready_for_ads(UUID) TO authenticated;
