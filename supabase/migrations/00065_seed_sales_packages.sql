-- Re-seed sales packages after data wipes (schema may exist without rows from 00005).
-- Upsert by code so existing deployments stay in sync.

INSERT INTO public.packages (code, name, description, base_price, is_active)
VALUES
  (
    'gmv_max',
    'ดูแล GMV Max',
    'บริการดูแลแคมเปญ GMV Max รายเดือน — วางแผน ยิงแอด รายงานผล',
    15000,
    TRUE
  ),
  (
    'gmv_course',
    'คอร์ส GMV Max',
    'อบรม GMV Max แบบ intensive — กลุ่มเล็ก + แนวทางปฏิบัติ',
    9900,
    TRUE
  ),
  (
    'tiktok_one',
    'TikTok One / Creator',
    'บริการ Creator & TikTok One — จับคู่ครีเอเตอร์และดูแลโปรเจกต์',
    20000,
    TRUE
  ),
  (
    'content',
    'ผลิตคอนเทนต์',
    'ผลิตคลิปและคอนเทนต์สำหรับ TikTok / Reels — ตามแพ็กเกจชิ้น',
    12000,
    TRUE
  ),
  (
    'live',
    'Live Commerce',
    'บริการไลฟ์ขาย — จัดไลฟ์ ดูแลห้อง และสรุปผลหลังไลฟ์',
    18000,
    TRUE
  ),
  (
    'consulting',
    'Private Consulting',
    'ที่ปรึกษาแบบส่วนตัว — วิเคราะห์ธุรกิจและแผนการตลาด',
    25000,
    TRUE
  ),
  (
    'software',
    'Software / License',
    'ซอฟต์แวร์และไลเซนส์ NP Create — รายเดือนหรือรายปี',
    8000,
    TRUE
  ),
  (
    'other',
    'บริการอื่น ๆ',
    'บริการอื่นตามข้อตกลง — กำหนดราคาในใบเสนอราคา',
    0,
    TRUE
  )
ON CONFLICT (code) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  base_price = EXCLUDED.base_price,
  is_active = EXCLUDED.is_active;
