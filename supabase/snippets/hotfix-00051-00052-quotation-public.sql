-- Hotfix SQL Editor: รัน 2 ครั้งแยกกัน (กด Run ทีละบล็อก) หรือ 2 แท็บ query

-- === บล็อก 1: enum (commit ก่อน) ===
ALTER TYPE public.quotation_status ADD VALUE IF NOT EXISTS 'viewed';
ALTER TYPE public.quotation_status ADD VALUE IF NOT EXISTS 'accepted';

-- === บล็อก 2: วางหลังบล็อก 1 สำเร็จ — copy จาก 00052_quotation_public_flow.sql ===
