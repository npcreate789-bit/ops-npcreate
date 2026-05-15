-- Sprint 3: customer ก่อนชำระเงิน, ความปลอดภัย RPC, admin สร้างใบเสนอราคา

CREATE OR REPLACE FUNCTION public.ensure_customer_from_lead(p_lead_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead public.leads%ROWTYPE;
  v_customer_id UUID;
BEGIN
  IF NOT (
    public.is_privileged()
    OR public.has_role('admin')
    OR EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = p_lead_id AND l.owner_id = auth.uid()
    )
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT * INTO v_lead FROM public.leads WHERE id = p_lead_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lead not found';
  END IF;
  IF v_lead.customer_id IS NOT NULL THEN
    RETURN v_lead.customer_id;
  END IF;

  INSERT INTO public.customers (
    lead_id,
    brand_name,
    contact_name,
    phone,
    line_id,
    business_type,
    package_name,
    status,
    sales_owner_id
  ) VALUES (
    v_lead.id,
    v_lead.brand_name,
    v_lead.contact_name,
    v_lead.phone,
    v_lead.line_id,
    v_lead.business_type,
    NULLIF(ARRAY_TO_STRING(v_lead.services_interested, ', '), ''),
    'pending',
    v_lead.owner_id
  )
  RETURNING id INTO v_customer_id;

  UPDATE public.leads
  SET customer_id = v_customer_id, updated_at = NOW()
  WHERE id = p_lead_id;

  RETURN v_customer_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.promote_lead_to_customer(p_lead_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_id UUID;
BEGIN
  v_customer_id := public.ensure_customer_from_lead(p_lead_id);

  UPDATE public.leads
  SET
    status = 'won',
    converted_at = COALESCE(converted_at, NOW()),
    updated_at = NOW()
  WHERE id = p_lead_id;

  RETURN v_customer_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_customer_from_lead(UUID) TO authenticated;

DROP POLICY IF EXISTS quotations_insert ON public.quotations;

CREATE POLICY quotations_insert ON public.quotations
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_privileged()
    OR (
      owner_id = auth.uid()
      AND public.has_any_role(ARRAY['sales', 'ceo', 'admin']::public.app_role[])
    )
  );
