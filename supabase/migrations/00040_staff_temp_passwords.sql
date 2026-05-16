-- รหัสผ่านชั่วคราว + บังคับเปลี่ยนครั้งแรก (CEO ดูรหัสชั่วคราวได้)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS public.staff_password_hints (
  user_id UUID PRIMARY KEY REFERENCES public.profiles (id) ON DELETE CASCADE,
  temporary_password TEXT NOT NULL,
  must_change BOOLEAN NOT NULL DEFAULT TRUE,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  issued_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL
);

ALTER TABLE public.staff_password_hints ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS staff_password_hints_ceo_select ON public.staff_password_hints;

CREATE POLICY staff_password_hints_ceo_select ON public.staff_password_hints
  FOR SELECT TO authenticated
  USING (public.has_role('ceo'));

CREATE OR REPLACE FUNCTION public.complete_password_change()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'ต้องเข้าสู่ระบบ';
  END IF;

  UPDATE public.profiles
  SET must_change_password = FALSE, updated_at = NOW()
  WHERE id = auth.uid();

  DELETE FROM public.staff_password_hints WHERE user_id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.complete_password_change() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_password_change() TO authenticated;
