-- แยก LINE Login user id กับ user id ในแชท Official Account (chat.line.biz)

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS line_oa_chat_user_id TEXT;

COMMENT ON COLUMN public.leads.line_user_id IS
  'LINE Login user ID จาก OAuth บนฟอร์มติดต่อ — ใช้ push ได้เมื่อช่อง Login กับ Messaging API ผูก provider เดียวกัน';

COMMENT ON COLUMN public.leads.line_oa_chat_user_id IS
  'LINE Messaging API user id จากแชท OA (segment หลัง /chat/ บน chat.line.biz) — ใช้เปิดแชทตรงและ push ที่ตรงกับ OA';
