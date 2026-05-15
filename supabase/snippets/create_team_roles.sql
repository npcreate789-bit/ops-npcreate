-- มอบ role เริ่มต้นสำหรับทีม NP Create (แก้ email ให้ตรง user จริง)

-- CEO
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'ceo'::public.app_role FROM public.profiles WHERE email = 'ceo@npcreate.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Operations
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'operations'::public.app_role FROM public.profiles WHERE email = 'ops@npcreate.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Sales (2 คน)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'sales'::public.app_role FROM public.profiles WHERE email IN ('sales1@npcreate.com', 'sales2@npcreate.com')
ON CONFLICT (user_id, role) DO NOTHING;

-- Account
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'account'::public.app_role FROM public.profiles WHERE email IN ('account1@npcreate.com', 'account2@npcreate.com')
ON CONFLICT (user_id, role) DO NOTHING;

-- Admin / Finance
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role FROM public.profiles WHERE email = 'admin@npcreate.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Dev
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'dev'::public.app_role FROM public.profiles WHERE email = 'dev@npcreate.com'
ON CONFLICT (user_id, role) DO NOTHING;
