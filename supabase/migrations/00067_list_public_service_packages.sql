-- รายการแพ็กเกจที่เปิดใช้งาน สำหรับฟอร์มติดต่อสาธารณะ (ไม่ต้องล็อกอิน)

CREATE OR REPLACE FUNCTION public.list_public_service_packages()
RETURNS TABLE (code TEXT, name TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.code, p.name
  FROM public.packages p
  WHERE p.is_active = TRUE
  ORDER BY p.name;
$$;

REVOKE ALL ON FUNCTION public.list_public_service_packages() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_public_service_packages() TO anon, authenticated;
