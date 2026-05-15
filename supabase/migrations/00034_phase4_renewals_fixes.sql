-- Phase 4: หลังขยายสัญญา ปิดเคส renewal อัตโนมัติ

CREATE OR REPLACE FUNCTION public.extend_customer_contract(
  p_customer_id UUID,
  p_months INT
)
RETURNS public.customers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.customers;
BEGIN
  IF p_months IS NULL OR p_months < 1 OR p_months > 36 THEN
    RAISE EXCEPTION 'extension months must be between 1 and 36';
  END IF;

  IF NOT (
    public.is_privileged()
    OR public.has_role('account')
    OR public.has_role('operations')
  ) THEN
    RAISE EXCEPTION 'not allowed to extend contract';
  END IF;

  UPDATE public.customers
  SET
    contract_end = GREATEST(COALESCE(contract_end, CURRENT_DATE), CURRENT_DATE)
      + (p_months || ' months')::INTERVAL,
    status = CASE
      WHEN status = 'ended' THEN 'active'::public.customer_status
      ELSE status
    END,
    updated_at = NOW()
  WHERE id = p_customer_id
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'customer not found';
  END IF;

  UPDATE public.contract_renewals
  SET
    status = 'renewed',
    extension_months = p_months,
    updated_at = NOW()
  WHERE customer_id = p_customer_id
    AND status NOT IN ('renewed', 'declined');

  RETURN v_row;
END;
$$;
