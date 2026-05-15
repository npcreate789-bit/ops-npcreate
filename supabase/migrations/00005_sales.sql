-- Sprint 3 — Sales: packages, customers, quotations

CREATE TYPE public.customer_status AS ENUM ('pending', 'active', 'at_risk', 'ended');

CREATE TYPE public.quotation_status AS ENUM (
  'draft',
  'sent',
  'awaiting_payment',
  'paid',
  'cancelled'
);

CREATE TABLE public.packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  base_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.packages (code, name, description, base_price) VALUES
  ('gmv_max', 'ดูแล GMV Max', 'บริการดูแลแคมเปญ GMV Max', 15000),
  ('gmv_course', 'คอร์ส GMV Max', 'อบรม GMV Max', 9900),
  ('tiktok_one', 'TikTok One / Creator', 'บริการ Creator & TikTok One', 20000),
  ('content', 'ผลิตคอนเทนต์', 'ผลิตคลิปและคอนเทนต์', 12000),
  ('live', 'Live Commerce', 'บริการไลฟ์ขาย', 18000),
  ('consulting', 'Private Consulting', 'ที่ปรึกษาแบบส่วนตัว', 25000),
  ('software', 'Software / License', 'ซอฟต์แวร์และไลเซนส์', 8000),
  ('other', 'บริการอื่น ๆ', 'บริการอื่นตามข้อตกลง', 0)
ON CONFLICT (code) DO NOTHING;

CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID UNIQUE REFERENCES public.leads (id) ON DELETE SET NULL,
  brand_name TEXT NOT NULL,
  contact_name TEXT,
  phone TEXT,
  line_id TEXT,
  business_type TEXT,
  package_name TEXT,
  contract_start DATE,
  contract_end DATE,
  status public.customer_status NOT NULL DEFAULT 'pending',
  account_owner_id UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  ads_owner_id UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  sales_owner_id UUID NOT NULL REFERENCES public.profiles (id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.leads
  ADD CONSTRAINT leads_customer_id_fkey
  FOREIGN KEY (customer_id) REFERENCES public.customers (id) ON DELETE SET NULL;

CREATE TABLE public.quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_number TEXT NOT NULL UNIQUE,
  lead_id UUID REFERENCES public.leads (id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.customers (id) ON DELETE SET NULL,
  owner_id UUID NOT NULL REFERENCES public.profiles (id),
  status public.quotation_status NOT NULL DEFAULT 'draft',
  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
  discount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  vat_rate NUMERIC(5, 2) NOT NULL DEFAULT 7,
  vat_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total NUMERIC(12, 2) NOT NULL DEFAULT 0,
  contract_months INT,
  terms TEXT,
  notes TEXT,
  sent_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.quotation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID NOT NULL REFERENCES public.quotations (id) ON DELETE CASCADE,
  package_id UUID REFERENCES public.packages (id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  line_total NUMERIC(12, 2) NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0
);

CREATE INDEX quotations_owner_id_idx ON public.quotations (owner_id);
CREATE INDEX quotations_lead_id_idx ON public.quotations (lead_id);
CREATE INDEX quotations_status_idx ON public.quotations (status);
CREATE INDEX customers_sales_owner_id_idx ON public.customers (sales_owner_id);

CREATE SEQUENCE IF NOT EXISTS public.quotation_number_seq START 1001;

CREATE OR REPLACE FUNCTION public.next_quotation_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  n BIGINT;
BEGIN
  n := nextval('public.quotation_number_seq');
  RETURN 'QT-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(n::TEXT, 4, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.promote_lead_to_customer(p_lead_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead public.leads%ROWTYPE;
  v_customer_id UUID;
BEGIN
  SELECT * INTO v_lead FROM public.leads WHERE id = p_lead_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lead not found';
  END IF;
  IF v_lead.customer_id IS NOT NULL THEN
    RETURN v_lead.customer_id;
  END IF;

  INSERT INTO public.customers (
    lead_id,
    brand_name,
    contact_name,
    phone,
    line_id,
    business_type,
    package_name,
    status,
    sales_owner_id
  ) VALUES (
    v_lead.id,
    v_lead.brand_name,
    v_lead.contact_name,
    v_lead.phone,
    v_lead.line_id,
    v_lead.business_type,
    NULLIF(ARRAY_TO_STRING(v_lead.services_interested, ', '), ''),
    'pending',
    v_lead.owner_id
  )
  RETURNING id INTO v_customer_id;

  UPDATE public.leads
  SET
    customer_id = v_customer_id,
    status = 'won',
    converted_at = NOW(),
    updated_at = NOW()
  WHERE id = p_lead_id;

  RETURN v_customer_id;
END;
$$;

CREATE TRIGGER customers_set_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER quotations_set_updated_at
  BEFORE UPDATE ON public.quotations
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY packages_select ON public.packages
  FOR SELECT TO authenticated
  USING (TRUE);

CREATE POLICY customers_select ON public.customers
  FOR SELECT TO authenticated
  USING (
    public.is_privileged()
    OR sales_owner_id = auth.uid()
    OR public.has_role('admin')
    OR public.has_role('account')
  );

CREATE POLICY customers_insert ON public.customers
  FOR INSERT TO authenticated
  WITH CHECK (public.is_privileged() OR sales_owner_id = auth.uid());

CREATE POLICY customers_update ON public.customers
  FOR UPDATE TO authenticated
  USING (public.is_privileged() OR sales_owner_id = auth.uid())
  WITH CHECK (public.is_privileged() OR sales_owner_id = auth.uid());

CREATE POLICY quotations_select ON public.quotations
  FOR SELECT TO authenticated
  USING (
    public.is_privileged()
    OR owner_id = auth.uid()
    OR public.has_role('admin')
  );

CREATE POLICY quotations_insert ON public.quotations
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_privileged()
    OR (owner_id = auth.uid() AND public.has_any_role(ARRAY['sales', 'ceo']::public.app_role[]))
  );

CREATE POLICY quotations_update ON public.quotations
  FOR UPDATE TO authenticated
  USING (public.is_privileged() OR owner_id = auth.uid())
  WITH CHECK (public.is_privileged() OR owner_id = auth.uid());

CREATE POLICY quotations_delete ON public.quotations
  FOR DELETE TO authenticated
  USING (public.is_privileged());

CREATE POLICY quotation_items_select ON public.quotation_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quotations q
      WHERE q.id = quotation_id
        AND (public.is_privileged() OR q.owner_id = auth.uid() OR public.has_role('admin'))
    )
  );

CREATE POLICY quotation_items_insert ON public.quotation_items
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.quotations q
      WHERE q.id = quotation_id
        AND (public.is_privileged() OR q.owner_id = auth.uid())
    )
  );

CREATE POLICY quotation_items_update ON public.quotation_items
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quotations q
      WHERE q.id = quotation_id
        AND (public.is_privileged() OR q.owner_id = auth.uid())
    )
  );

CREATE POLICY quotation_items_delete ON public.quotation_items
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quotations q
      WHERE q.id = quotation_id
        AND (public.is_privileged() OR q.owner_id = auth.uid())
    )
  );

-- Allow authenticated users to call promote (checked inside via lead ownership in app)
GRANT EXECUTE ON FUNCTION public.promote_lead_to_customer(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.next_quotation_number() TO authenticated;
