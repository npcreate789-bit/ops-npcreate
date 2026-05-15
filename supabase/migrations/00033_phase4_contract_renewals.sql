-- Phase 4 / Sprint 14: ติดตามต่อสัญญา

CREATE TYPE public.contract_renewal_status AS ENUM (
  'open',
  'contacted',
  'quoted',
  'renewed',
  'declined'
);

CREATE TABLE public.contract_renewals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers (id) ON DELETE CASCADE,
  status public.contract_renewal_status NOT NULL DEFAULT 'open',
  contract_end DATE NOT NULL,
  extension_months INT,
  owner_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX contract_renewals_status_idx ON public.contract_renewals (status);
CREATE INDEX contract_renewals_contract_end_idx ON public.contract_renewals (contract_end);
CREATE UNIQUE INDEX contract_renewals_customer_open_idx
  ON public.contract_renewals (customer_id)
  WHERE status NOT IN ('renewed', 'declined');

CREATE TRIGGER contract_renewals_set_updated_at
  BEFORE UPDATE ON public.contract_renewals
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.contract_renewals ENABLE ROW LEVEL SECURITY;

CREATE POLICY contract_renewals_select ON public.contract_renewals
  FOR SELECT TO authenticated
  USING (
    public.is_privileged()
    OR public.has_role('account')
    OR public.has_role('operations')
    OR public.has_role('admin')
    OR public.has_role('sales')
  );

CREATE POLICY contract_renewals_insert ON public.contract_renewals
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND (
      public.is_privileged()
      OR public.has_role('account')
      OR public.has_role('operations')
    )
  );

CREATE POLICY contract_renewals_update ON public.contract_renewals
  FOR UPDATE TO authenticated
  USING (
    public.is_privileged()
    OR public.has_role('account')
    OR public.has_role('operations')
    OR owner_id = auth.uid()
  )
  WITH CHECK (
    public.is_privileged()
    OR public.has_role('account')
    OR public.has_role('operations')
    OR owner_id = auth.uid()
  );

CREATE POLICY contract_renewals_delete ON public.contract_renewals
  FOR DELETE TO authenticated
  USING (public.is_privileged());

-- ขยายวันสิ้นสุดสัญญาลูกค้า (Account / Ops / Privileged)
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

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.extend_customer_contract(UUID, INT) TO authenticated;
