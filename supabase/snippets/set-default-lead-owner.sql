-- ตั้ง Sales รับ Lead จากฟอร์ม /contact
-- รันใน Supabase → SQL Editor

-- 1) ดูรายชื่อ Sales ที่ใช้ได้ (ต้องมีแถวใน profiles)
SELECT
  p.id,
  p.login_id,
  p.email,
  p.full_name,
  p.is_active
FROM public.profiles p
INNER JOIN public.user_roles ur ON ur.user_id = p.id
WHERE ur.role = 'sales'
  AND p.is_active = TRUE
ORDER BY p.created_at;

-- 2) ลบค่า UUID ปลอม/ผิด (แก้ FK leads_owner_id_fkey ทันที)
DELETE FROM public.platform_settings
WHERE key = 'default_lead_owner_id';

-- 3) ใส่ UUID จากขั้นตอนที่ 1 (แทนค่าด้านล่าง)
/*
INSERT INTO public.platform_settings (key, value)
VALUES (
  'default_lead_owner_id',
  to_jsonb('วาง-profiles.id-ของ-sales-ที่นี่'::text)
)
ON CONFLICT (key) DO UPDATE
  SET value = EXCLUDED.value,
      updated_at = NOW();
*/

-- ถ้าไม่ตั้งขั้น 3 ระบบจะใช้ Sales คนแรกที่ active อัตโนมัติ (หลังรัน migration 00045)
