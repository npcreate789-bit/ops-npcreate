-- เฉพาะ CEO จัดการบทบาท CEO (มอบ/ถอน/แก้บทบาทอื่นของผู้ใช้ที่เป็น CEO)

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
    IF NOT public.has_role('ceo') THEN
      RAISE EXCEPTION 'เฉพาะ CEO เท่านั้นที่จัดการบทบาท CEO ได้';
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS user_roles_guard_ceo ON public.user_roles;

CREATE TRIGGER user_roles_guard_ceo
  BEFORE INSERT OR DELETE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_user_roles_ceo();
