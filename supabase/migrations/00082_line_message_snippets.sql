-- CRM LINE quick-reply snippets by package (บริการที่สนใจ)

CREATE TABLE public.line_message_snippets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_code TEXT REFERENCES public.packages (code) ON DELETE SET NULL,
  category TEXT NOT NULL DEFAULT 'service_intro'
    CHECK (category IN ('service_intro', 'promotion', 'follow_up', 'objection', 'general')),
  title TEXT NOT NULL
    CHECK (char_length(trim(title)) BETWEEN 1 AND 80),
  body TEXT NOT NULL
    CHECK (char_length(trim(body)) BETWEEN 1 AND 5000),
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX line_message_snippets_package_active_idx
  ON public.line_message_snippets (package_code, sort_order, created_at)
  WHERE is_active = TRUE;

CREATE TRIGGER line_message_snippets_set_updated_at
  BEFORE UPDATE ON public.line_message_snippets
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.line_message_snippets ENABLE ROW LEVEL SECURITY;

CREATE POLICY line_message_snippets_select ON public.line_message_snippets
  FOR SELECT TO authenticated
  USING (
    public.is_privileged()
    OR public.has_role('admin')
    OR public.has_any_role(ARRAY['sales', 'operations']::public.app_role[])
  );

CREATE POLICY line_message_snippets_insert ON public.line_message_snippets
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_privileged()
    OR public.has_role('sales')
  );

CREATE POLICY line_message_snippets_update ON public.line_message_snippets
  FOR UPDATE TO authenticated
  USING (
    public.is_privileged()
    OR public.has_role('sales')
  )
  WITH CHECK (
    public.is_privileged()
    OR public.has_role('sales')
  );

CREATE POLICY line_message_snippets_delete ON public.line_message_snippets
  FOR DELETE TO authenticated
  USING (
    public.is_privileged()
    OR public.has_role('sales')
  );

-- Seed: ทั่วไป (เสมอ) + ตามแพ็กเกจที่มีใน packages
INSERT INTO public.line_message_snippets (package_code, category, title, body, sort_order)
VALUES
  (
    NULL,
    'general',
    'ทักทายครั้งแรก',
    'สวัสดีครับ/ค่ะ จากทีม NP Create ขอบคุณที่สนใจบริการของเรานะครับ/คะ\n\nรบกวนแจ้งชื่อร้าน/แบรนด์ และเป้าหมายหลักที่อยากโฟกัสช่วงนี้ได้ไหมครับ/คะ ทีมจะช่วยแนะนำแพ็กเกจที่เหมาะให้ครับ/ค่ะ',
    10
  ),
  (
    NULL,
    'follow_up',
    'ติดตามหลังคุย',
    'สวัสดีครับ/ค่ะ ขออนุญาตติดตามจากที่คุยกันไว้นะครับ/คะ\n\nหากสะดวก แจ้งช่วงเวลาที่อยากเริ่มงานหรืองบโดยประมาณได้เลย ทีมพร้อมสรุปขั้นตอนและใบเสนอราคาให้ครับ/ค่ะ',
    20
  );

INSERT INTO public.line_message_snippets (package_code, category, title, body, sort_order)
SELECT v.code, v.category, v.title, v.body, v.sort_order
FROM (
  VALUES
    (
      'gmv_max'::text,
      'service_intro'::text,
      'แนะนำ GMV Max'::text,
      'สวัสดีครับ/ค่ะ สำหรับบริการดูแล GMV Max ทีมจะช่วยวางแผน ยิงแอด ปรับสเกล และรายงานผลรายสัปดาห์ให้ครับ/คะ\n\nเหมาะกับร้านที่อยากโฟกัสยอดขายบน TikTok Shop แบบเป็นระบบ — สนใจให้สรุปแพ็กเกจและราคาเริ่มต้นให้ไหมครับ/คะ'::text,
      10
    ),
    (
      'gmv_max',
      'promotion',
      'โปรเริ่มต้น GMV Max',
      'ช่วงนี้มีแพ็กเกจดูแล GMV Max เริ่มต้นที่ราคาพิเศษสำหรับร้านที่พร้อมเริ่มภายในเดือนนี้ครับ/คะ\n\nถ้าสะดวก ทีมขอสรุปขอบเขตงาน + ใบเสนอราคาให้ภายใน 1 วันทำการได้เลยครับ/ค่ะ',
      20
    ),
    (
      'gmv_course',
      'service_intro',
      'แนะนำคอร์ส GMV Max',
      'สวัสดีครับ/ค่ะ คอร์ส GMV Max ของ NP Create เน้นปฏิบัติจริง กลุ่มเล็ก มีแนวทางยิงแอดและสเกลที่ทำต่อได้ทันทีครับ/คะ\n\nสนใจให้ส่งรายละเอียดรอบถัดไปและราคาให้ไหมครับ/คะ',
      10
    ),
    (
      'content',
      'service_intro',
      'แนะนำผลิตคอนเทนต์',
      'ทีมผลิตคอนเทนต์ช่วยวางคอนเซ็ปต์ ถ่าย/ตัดต่อคลิปสำหรับ TikTok และ Reels ตามแพ็กเกจชิ้นครับ/คะ\n\nบอกจำนวนคลิปที่ต้องการต่อเดือนได้เลย จะสรุปราคาและไทม์ไลน์ให้ครับ/ค่ะ',
      10
    ),
    (
      'tiktok_one',
      'service_intro',
      'แนะนำ TikTok One',
      'บริการ TikTok One / Creator ช่วยจับคู่ครีเอเตอร์และดูแลโปรเจกต์ end-to-end ครับ/คะ\n\nหากมีเป้าหมายเรื่อง reach หรือ conversion แจ้งได้เลย ทีมจะเสนอแนวทางที่เหมาะกับงบให้ครับ/ค่ะ',
      10
    ),
    (
      'live',
      'service_intro',
      'แนะนำไลฟ์คอมเมิร์ซ',
      'บริการไลฟ์ขายครบวงจร — จัดไลฟ์ ดูแลห้อง สรุปผลหลังไลฟ์ครับ/คะ\n\nสนใจให้ทีมประเมินความถี่ไลฟ์และงบที่เหมาะกับร้านไหมครับ/คะ',
      10
    )
) AS v(code, category, title, body, sort_order)
WHERE EXISTS (
  SELECT 1 FROM public.packages p WHERE p.code = v.code
);
