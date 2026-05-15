-- Seed onboarding checklist when payment is confirmed

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
  SELECT * INTO v_payment FROM public.payments WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found';
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
