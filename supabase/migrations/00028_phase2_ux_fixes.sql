-- Phase 2 UX fixes: content อ่านลูกค้า active สำหรับ dropdown

CREATE POLICY customers_select_content ON public.customers
  FOR SELECT TO authenticated
  USING (
    public.has_role('content')
    AND status IN ('active', 'pending')
  );
