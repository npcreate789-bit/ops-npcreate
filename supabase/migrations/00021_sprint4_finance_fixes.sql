-- Sprint 4: จำกัด confirm_payment, อัปเดตสลิป storage

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
END;
$$;

DROP POLICY IF EXISTS payments_storage_update ON storage.objects;

CREATE POLICY payments_storage_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'payments'
    AND (public.is_privileged() OR public.has_role('admin'))
  )
  WITH CHECK (
    bucket_id = 'payments'
    AND (public.is_privileged() OR public.has_role('admin'))
  );
