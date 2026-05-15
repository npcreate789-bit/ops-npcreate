-- หลังสร้าง user ใน Supabase Auth แล้ว
-- แทนที่ USER_ID ด้วย UUID จาก Authentication → Users

-- ตรวจสอบ profile (สร้างอัตโนมัติจาก trigger)
-- SELECT id, email, full_name FROM public.profiles WHERE email = 'your@email.com';

INSERT INTO public.user_roles (user_id, role)
VALUES ('USER_ID'::uuid, 'ceo')
ON CONFLICT (user_id, role) DO NOTHING;

-- ตัวอย่าง: เพิ่ม role sales ให้ user อื่น
-- INSERT INTO public.user_roles (user_id, role)
-- VALUES ('USER_ID'::uuid, 'sales')
-- ON CONFLICT (user_id, role) DO NOTHING;
