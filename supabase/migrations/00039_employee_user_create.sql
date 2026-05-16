-- สิทธิ์สร้างบัญชีพนักงาน (CEO / Operations / Dev) และตรวจรหัสผู้ใช้ซ้ำ

CREATE OR REPLACE FUNCTION public.can_create_employee_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_any_role(ARRAY['ceo', 'operations', 'dev']::public.app_role[]);
$$;

CREATE OR REPLACE FUNCTION public.check_login_id_available(p_login_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.can_create_employee_user() THEN
    RAISE EXCEPTION 'ไม่มีสิทธิ์ตรวจสอบรหัสผู้ใช้';
  END IF;

  IF p_login_id IS NULL OR length(trim(p_login_id)) < 3 THEN
    RETURN FALSE;
  END IF;

  RETURN NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE lower(login_id) = lower(trim(p_login_id))
  );
END;
$$;

REVOKE ALL ON FUNCTION public.can_create_employee_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_create_employee_user() TO authenticated;

REVOKE ALL ON FUNCTION public.check_login_id_available(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_login_id_available(TEXT) TO authenticated;
