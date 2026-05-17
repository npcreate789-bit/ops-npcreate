-- ต้องแยกไฟล์: ค่า enum ใหม่ต้อง commit ก่อนใช้ใน function (PostgreSQL 55P04)

ALTER TYPE public.quotation_status ADD VALUE IF NOT EXISTS 'viewed';
ALTER TYPE public.quotation_status ADD VALUE IF NOT EXISTS 'accepted';
