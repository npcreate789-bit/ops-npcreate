-- Sprint 4 — Finance: payments, receipts, contracts linkage

CREATE TYPE public.payment_status AS ENUM ('pending', 'paid', 'overdue', 'cancelled');

CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers (id) ON DELETE RESTRICT,
  quotation_id UUID REFERENCES public.quotations (id) ON DELETE SET NULL,
  recorded_by UUID NOT NULL REFERENCES public.profiles (id),
  service_type TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  vat_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  status public.payment_status NOT NULL DEFAULT 'pending',
  payment_date DATE,
  due_date DATE,
  slip_path TEXT,
  receipt_number TEXT UNIQUE,
  tax_invoice_number TEXT UNIQUE,
  notes TEXT,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX payments_customer_id_idx ON public.payments (customer_id);
CREATE INDEX payments_status_idx ON public.payments (status);
CREATE INDEX payments_payment_date_idx ON public.payments (payment_date);
CREATE INDEX payments_due_date_idx ON public.payments (due_date) WHERE due_date IS NOT NULL;

CREATE SEQUENCE IF NOT EXISTS public.receipt_number_seq START 1001;
CREATE SEQUENCE IF NOT EXISTS public.tax_invoice_number_seq START 1001;

CREATE OR REPLACE FUNCTION public.next_receipt_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE n BIGINT;
BEGIN
  n := nextval('public.receipt_number_seq');
  RETURN 'RC-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(n::TEXT, 4, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.next_tax_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE n BIGINT;
BEGIN
  n := nextval('public.tax_invoice_number_seq');
  RETURN 'INV-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(n::TEXT, 4, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.confirm_payment(p_payment_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment public.payments%ROWTYPE;
  v_months INT;
BEGIN
  SELECT * INTO v_payment FROM public.payments WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found';
  END IF;

  UPDATE public.payments
  SET
    status = 'paid',
    payment_date = COALESCE(v_payment.payment_date, CURRENT_DATE),
    confirmed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_payment_id;

  SELECT q.contract_months INTO v_months
  FROM public.quotations q
  WHERE q.id = v_payment.quotation_id;

  UPDATE public.customers
  SET
    status = 'active',
    package_name = COALESCE(package_name, v_payment.service_type),
    contract_start = COALESCE(contract_start, CURRENT_DATE),
    contract_end = COALESCE(
      contract_end,
      CURRENT_DATE + COALESCE(v_months, 3) * INTERVAL '1 month'
    )::DATE,
    updated_at = NOW()
  WHERE id = v_payment.customer_id;
END;
$$;

CREATE TRIGGER payments_set_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY payments_select ON public.payments
  FOR SELECT TO authenticated
  USING (
    public.is_privileged()
    OR public.has_role('admin')
    OR public.has_role('sales')
    OR public.has_role('account')
  );

CREATE POLICY payments_insert ON public.payments
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_privileged()
    OR public.has_role('admin')
  );

CREATE POLICY payments_update ON public.payments
  FOR UPDATE TO authenticated
  USING (public.is_privileged() OR public.has_role('admin'))
  WITH CHECK (public.is_privileged() OR public.has_role('admin'));

CREATE POLICY payments_delete ON public.payments
  FOR DELETE TO authenticated
  USING (public.is_privileged());

GRANT EXECUTE ON FUNCTION public.confirm_payment(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.next_receipt_number() TO authenticated;
GRANT EXECUTE ON FUNCTION public.next_tax_invoice_number() TO authenticated;
