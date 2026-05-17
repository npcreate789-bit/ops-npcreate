-- ปิดช่อง: client (และผู้ใช้ทั่วไป) อ่าน profiles ของพนักงานทุกคนที่ is_active = TRUE
-- นโยบายเดิมรวม profiles_select_team + OR is_active = TRUE ทำให้ enumerate อีเมล/รหัสผู้ใช้ได้

DROP POLICY IF EXISTS profiles_select_team ON public.profiles;
DROP POLICY IF EXISTS profiles_select ON public.profiles;

CREATE POLICY profiles_select ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR public.is_privileged()
    OR (
      is_active = TRUE
      AND public.has_any_role(
        ARRAY[
          'account',
          'admin',
          'operations',
          'sales',
          'ads',
          'senior_ads',
          'content'
        ]::public.app_role[]
      )
    )
  );
