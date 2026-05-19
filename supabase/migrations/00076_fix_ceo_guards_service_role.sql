-- Edge functions (service_role) already authorize CEO actions; triggers must not block them.

CREATE OR REPLACE FUNCTION public.can_manage_ceo_accounts()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role('ceo')
    OR COALESCE(auth.role(), '') = 'service_role'
    OR COALESCE(auth.jwt() ->> 'role', '') = 'service_role';
$$;

REVOKE ALL ON FUNCTION public.can_manage_ceo_accounts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_manage_ceo_accounts() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_ceo_accounts() TO service_role;

CREATE OR REPLACE FUNCTION public.guard_user_roles_ceo()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_id UUID;
  affected_role public.app_role;
BEGIN
  target_id := COALESCE(NEW.user_id, OLD.user_id);
  affected_role := COALESCE(NEW.role, OLD.role);

  IF affected_role = 'ceo'
     OR EXISTS (
       SELECT 1
       FROM public.user_roles ur
       WHERE ur.user_id = target_id
         AND ur.role = 'ceo'
     )
  THEN
    IF NOT public.can_manage_ceo_accounts() THEN
      RAISE EXCEPTION 'เฉพาะ CEO เท่านั้นที่จัดการบทบาท CEO ได้';
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.guard_ceo_profile_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_active IS DISTINCT FROM OLD.is_active
     AND EXISTS (
       SELECT 1
       FROM public.user_roles ur
       WHERE ur.user_id = NEW.id
         AND ur.role = 'ceo'
     )
  THEN
    IF NOT public.can_manage_ceo_accounts() THEN
      RAISE EXCEPTION 'เฉพาะ CEO เท่านั้นที่เปิด/ปิดบัญชี CEO ได้';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
