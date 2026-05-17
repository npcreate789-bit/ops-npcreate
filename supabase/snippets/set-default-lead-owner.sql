-- รันใน Supabase SQL Editor หลัง migration 00044
-- แทน UUID ด้วย profiles.id ของ Sales ที่รับ Lead จากฟอร์ม /contact

INSERT INTO public.platform_settings (key, value)
VALUES (
  'default_lead_owner_id',
  to_jsonb('00000000-0000-0000-0000-000000000000'::text)
)
ON CONFLICT (key) DO UPDATE
  SET value = EXCLUDED.value,
      updated_at = NOW();

-- ถ้าไม่ตั้งค่า ระบบจะใช้ user แรกที่มี role sales อัตโนมัติ (ดู submit_public_inquiry)
