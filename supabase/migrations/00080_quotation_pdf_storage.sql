-- Phase 2: ใบเสนอราคา PDF บน Storage (สร้างจาก Edge generate-quotation-pdf)

ALTER TABLE public.quotations
  ADD COLUMN IF NOT EXISTS pdf_storage_path TEXT,
  ADD COLUMN IF NOT EXISTS pdf_generated_at TIMESTAMPTZ;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'quotation-documents',
  'quotation-documents',
  false,
  10485760,
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- อ่าน/เขียน PDF ผ่าน service role ใน Edge Function เท่านั้น — ลูกค้าได้ลิงก์ signed URL ในข้อความ LINE
