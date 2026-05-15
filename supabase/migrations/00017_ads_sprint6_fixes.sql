-- Sprint 6 fixes: sync campaign owner, senior_ads mutate, ensure_default_campaign

-- 1) Sync campaigns.ads_owner_id when assigning customer owners
CREATE OR REPLACE FUNCTION public.assign_customer_owners(
  p_customer_id UUID,
  p_account_owner_id UUID DEFAULT NULL,
  p_ads_owner_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (
    public.is_privileged()
    OR public.has_role('account')
    OR public.has_role('admin')
  ) THEN
    RAISE EXCEPTION 'not allowed to assign owners';
  END IF;

  UPDATE public.customers
  SET
    account_owner_id = p_account_owner_id,
    ads_owner_id = p_ads_owner_id,
    updated_at = NOW()
  WHERE id = p_customer_id
    AND status IN ('pending', 'active');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'customer not found';
  END IF;

  IF p_ads_owner_id IS NOT NULL THEN
    UPDATE public.campaigns
    SET ads_owner_id = p_ads_owner_id, updated_at = NOW()
    WHERE customer_id = p_customer_id;
  END IF;
END;
$$;

-- 2) Claim customer + sync existing campaigns
CREATE OR REPLACE FUNCTION public.claim_ads_customer(
  p_customer_id UUID,
  p_ads_owner_id UUID DEFAULT auth.uid()
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_ads_owner_id IS NULL THEN
    RAISE EXCEPTION 'ads owner required';
  END IF;

  IF NOT (
    public.has_role('senior_ads')
    OR (public.has_role('ads') AND p_ads_owner_id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'not allowed to claim customer';
  END IF;

  UPDATE public.customers
  SET ads_owner_id = p_ads_owner_id, updated_at = NOW()
  WHERE id = p_customer_id
    AND ready_for_ads = TRUE
    AND status = 'active'
    AND (ads_owner_id IS NULL OR ads_owner_id = p_ads_owner_id);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'customer not available to claim';
  END IF;

  UPDATE public.campaigns
  SET ads_owner_id = p_ads_owner_id, updated_at = NOW()
  WHERE customer_id = p_customer_id;
END;
$$;

-- 3) Ensure campaign exists and owner stays in sync
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
  v_budget NUMERIC(12, 2);
BEGIN
  SELECT id INTO v_id FROM public.campaigns WHERE customer_id = p_customer_id LIMIT 1;

  IF v_id IS NOT NULL THEN
    UPDATE public.campaigns
    SET
      ads_owner_id = p_ads_owner_id,
      updated_at = NOW()
    WHERE id = v_id
      AND ads_owner_id IS DISTINCT FROM p_ads_owner_id;
    RETURN v_id;
  END IF;

  SELECT daily_ad_budget INTO v_budget
  FROM public.onboarding_forms
  WHERE customer_id = p_customer_id;

  INSERT INTO public.campaigns (customer_id, ads_owner_id, name, daily_budget)
  VALUES (p_customer_id, p_ads_owner_id, 'แคมเปญหลัก', v_budget)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- 4) senior_ads may insert/update daily metrics (same visibility as select)
DROP POLICY IF EXISTS daily_metrics_insert ON public.daily_metrics;
CREATE POLICY daily_metrics_insert ON public.daily_metrics
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_id
        AND (
          public.is_privileged()
          OR c.ads_owner_id = auth.uid()
          OR public.has_role('senior_ads')
        )
    )
  );

DROP POLICY IF EXISTS daily_metrics_update ON public.daily_metrics;
CREATE POLICY daily_metrics_update ON public.daily_metrics
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_id
        AND (
          public.is_privileged()
          OR c.ads_owner_id = auth.uid()
          OR public.has_role('senior_ads')
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_id
        AND (
          public.is_privileged()
          OR c.ads_owner_id = auth.uid()
          OR public.has_role('senior_ads')
        )
    )
  );
