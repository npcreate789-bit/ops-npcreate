-- เฉพาะ CEO เปิด/ปิดบัญชีผู้ใช้ที่มีบทบาท CEO

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
    IF NOT public.has_role('ceo') THEN
      RAISE EXCEPTION 'เฉพาะ CEO เท่านั้นที่เปิด/ปิดบัญชี CEO ได้';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_guard_ceo_status ON public.profiles;

CREATE TRIGGER profiles_guard_ceo_status
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_ceo_profile_status();
