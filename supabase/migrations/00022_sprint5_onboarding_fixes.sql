-- Sprint 5: สิทธิ์ onboarding, RPC auth, refresh หลังชำระเงิน

CREATE OR REPLACE FUNCTION public.ensure_onboarding_checklist(p_customer_id UUID)
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
    OR public.has_role('operations')
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

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
  IF NOT (
    public.is_privileged()
    OR public.has_role('account')
    OR public.has_role('admin')
    OR public.has_role('operations')
    OR public.has_role('ads')
    OR public.has_role('senior_ads')
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

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
    OR public.has_role('operations')
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
END;
$$;

-- อัปเดต confirm_payment ให้ refresh ready_for_ads หลังสร้าง checklist
CREATE OR REPLACE FUNCTION public.confirm_payment(p_payment_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment public.payments%ROWTYPE;
  v_months INT;
BEGIN
  IF NOT (public.is_privileged() OR public.has_role('admin')) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT * INTO v_payment FROM public.payments WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found';
  END IF;

  IF v_payment.status = 'paid' AND v_payment.confirmed_at IS NOT NULL THEN
    RETURN;
  END IF;

  UPDATE public.payments
  SET
    status = 'paid',
    payment_date = COALESCE(v_payment.payment_date, CURRENT_DATE),
    confirmed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_payment_id;

  SELECT q.contract_months INTO v_months
  FROM public.quotations q
  WHERE q.id = v_payment.quotation_id;

  UPDATE public.customers
  SET
    status = 'active',
    package_name = COALESCE(package_name, v_payment.service_type),
    contract_start = COALESCE(contract_start, CURRENT_DATE),
    contract_end = COALESCE(
      contract_end,
      CURRENT_DATE + COALESCE(v_months, 3) * INTERVAL '1 month'
    )::DATE,
    updated_at = NOW()
  WHERE id = v_payment.customer_id;

  PERFORM public.ensure_onboarding_checklist(v_payment.customer_id);
  PERFORM public.refresh_customer_ready_for_ads(v_payment.customer_id);
END;
$$;

DROP POLICY IF EXISTS onboarding_forms_select ON public.onboarding_forms;
DROP POLICY IF EXISTS onboarding_forms_insert ON public.onboarding_forms;
DROP POLICY IF EXISTS onboarding_forms_update ON public.onboarding_forms;
DROP POLICY IF EXISTS onboarding_checklist_select ON public.onboarding_checklist;
DROP POLICY IF EXISTS onboarding_checklist_update ON public.onboarding_checklist;

CREATE POLICY onboarding_forms_select ON public.onboarding_forms
  FOR SELECT TO authenticated
  USING (
    public.is_privileged()
    OR public.has_role('account')
    OR public.has_role('admin')
    OR public.has_role('operations')
    OR public.has_role('ads')
    OR public.has_role('senior_ads')
  );

CREATE POLICY onboarding_forms_insert ON public.onboarding_forms
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_privileged()
    OR public.has_role('account')
    OR public.has_role('admin')
  );

CREATE POLICY onboarding_forms_update ON public.onboarding_forms
  FOR UPDATE TO authenticated
  USING (
    public.is_privileged()
    OR public.has_role('account')
    OR public.has_role('admin')
  )
  WITH CHECK (
    public.is_privileged()
    OR public.has_role('account')
    OR public.has_role('admin')
  );

CREATE POLICY onboarding_checklist_select ON public.onboarding_checklist
  FOR SELECT TO authenticated
  USING (
    public.is_privileged()
    OR public.has_role('account')
    OR public.has_role('admin')
    OR public.has_role('operations')
    OR public.has_role('ads')
    OR public.has_role('senior_ads')
  );

CREATE POLICY onboarding_checklist_update ON public.onboarding_checklist
  FOR UPDATE TO authenticated
  USING (public.is_privileged() OR public.has_role('account'))
  WITH CHECK (public.is_privileged() OR public.has_role('account'));
