-- Allow ads team to claim unassigned customers (sets ads_owner_id once)

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
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_ads_customer(UUID, UUID) TO authenticated;

-- Ads team can read customers ready for campaigns
CREATE POLICY customers_select_ads ON public.customers
  FOR SELECT TO authenticated
  USING (
    ready_for_ads = TRUE
    AND status = 'active'
    AND (
      public.has_role('senior_ads')
      OR (public.has_role('ads') AND (ads_owner_id = auth.uid() OR ads_owner_id IS NULL))
    )
  );
