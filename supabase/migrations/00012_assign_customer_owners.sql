-- Allow account / operations to assign customer owners during onboarding

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
END;
$$;

GRANT EXECUTE ON FUNCTION public.assign_customer_owners(UUID, UUID, UUID) TO authenticated;
