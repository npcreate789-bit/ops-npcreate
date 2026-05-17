-- หนึ่งลูกค้าหนึ่งบัญชีพอร์ทัล (ถ้ารันไม่ผ่านเพราะมีซ้ำ ให้ลบแถวซ้ำใน client_customer_access ก่อน)

CREATE UNIQUE INDEX IF NOT EXISTS client_customer_access_customer_id_unique_idx
  ON public.client_customer_access (customer_id);
