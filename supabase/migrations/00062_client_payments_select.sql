-- ลูกค้าอ่านรายการชำระของตนเอง (Client Workspace → การชำระเงิน)
DROP POLICY IF EXISTS payments_select_client ON public.payments;

CREATE POLICY payments_select_client ON public.payments
  FOR SELECT TO authenticated
  USING (
    public.has_role('client')
    AND customer_id = public.my_client_customer_id()
  );
