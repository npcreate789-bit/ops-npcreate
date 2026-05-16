-- รหัสผู้ใช้สำหรับเข้าสู่ระบบ (แทนการพิมพ์อีเมลบนหน้า login)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS login_id TEXT;

-- เติมจากส่วนก่อน @ ของอีเมล (ผู้ใช้เดิม)
UPDATE public.profiles p
SET login_id = lower(split_part(p.email, '@', 1))
WHERE p.login_id IS NULL OR trim(p.login_id) = '';

-- แก้ซ้ำด้วย suffix สั้นจาก id
DO $$
DECLARE
  r RECORD;
  base TEXT;
  candidate TEXT;
  n INT;
BEGIN
  FOR r IN
    SELECT id, email, login_id
    FROM public.profiles
    WHERE login_id IS NOT NULL
  LOOP
    base := lower(trim(r.login_id));
    candidate := base;
    n := 1;
    WHILE EXISTS (
      SELECT 1 FROM public.profiles p2
      WHERE p2.id <> r.id AND lower(p2.login_id) = candidate
    ) LOOP
      candidate := base || '_' || left(replace(r.id::text, '-', ''), 4) || CASE WHEN n > 1 THEN n::text ELSE '' END;
      n := n + 1;
    END LOOP;
    IF candidate <> r.login_id THEN
      UPDATE public.profiles SET login_id = candidate WHERE id = r.id;
    END IF;
  END LOOP;
END;
$$;

ALTER TABLE public.profiles
  ALTER COLUMN login_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_login_id_lower_idx
  ON public.profiles (lower(login_id));

-- แปลง login_id → อีเมลสำหรับ Supabase Auth (เรียกก่อน signInWithPassword)
CREATE OR REPLACE FUNCTION public.resolve_login_email(p_login_id TEXT)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email
  FROM public.profiles
  WHERE lower(trim(login_id)) = lower(trim(p_login_id))
    AND is_active = TRUE
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.resolve_login_email(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_login_email(TEXT) TO anon, authenticated;

-- สร้างโปรไฟล์พร้อม login_id จาก metadata หรือส่วนก่อน @ ของอีเมล
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_login_id TEXT;
BEGIN
  v_login_id := lower(trim(COALESCE(
    NEW.raw_user_meta_data ->> 'login_id',
    split_part(NEW.email, '@', 1)
  )));

  INSERT INTO public.profiles (id, email, full_name, login_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    v_login_id
  );
  RETURN NEW;
END;
$$;
