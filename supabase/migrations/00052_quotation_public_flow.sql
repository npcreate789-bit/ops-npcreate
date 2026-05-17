-- Sprint: Quotation public link — หลัง 00051 (enum viewed/accepted)

ALTER TABLE public.quotations
  ADD COLUMN IF NOT EXISTS public_token UUID UNIQUE,
  ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS quotations_public_token_idx
  ON public.quotations (public_token)
  WHERE public_token IS NOT NULL;

CREATE OR REPLACE FUNCTION public.quotation_public_visible(p_status public.quotation_status)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_status::text IN (
    'sent',
    'viewed',
    'accepted',
    'awaiting_payment',
    'paid'
  );
$$;

CREATE OR REPLACE FUNCTION public.ensure_quotation_public_token(p_quotation_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.quotations%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM public.quotations WHERE id = p_quotation_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quotation not found';
  END IF;

  IF NOT (
    public.is_privileged()
    OR v_row.owner_id = auth.uid()
    OR public.has_role('admin')
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF NOT public.quotation_public_visible(v_row.status) THEN
    RAISE EXCEPTION 'Quotation must be sent before sharing a public link';
  END IF;

  IF v_row.public_token IS NULL THEN
    UPDATE public.quotations
    SET public_token = gen_random_uuid(), updated_at = NOW()
    WHERE id = p_quotation_id
    RETURNING public_token INTO v_row.public_token;
  END IF;

  RETURN v_row.public_token;
END;
$$;

CREATE OR REPLACE FUNCTION public.quotation_public_payload(p_quotation_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_q public.quotations%ROWTYPE;
  v_brand TEXT;
  v_items JSONB;
BEGIN
  SELECT * INTO v_q FROM public.quotations WHERE id = p_quotation_id;
  IF NOT FOUND OR NOT public.quotation_public_visible(v_q.status) THEN
    RETURN NULL;
  END IF;

  SELECT l.brand_name INTO v_brand
  FROM public.leads l
  WHERE l.id = v_q.lead_id;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', qi.id,
        'description', qi.description,
        'quantity', qi.quantity,
        'unit_price', qi.unit_price,
        'line_total', qi.line_total,
        'sort_order', qi.sort_order
      )
      ORDER BY qi.sort_order, qi.id
    ),
    '[]'::jsonb
  )
  INTO v_items
  FROM public.quotation_items qi
  WHERE qi.quotation_id = p_quotation_id;

  RETURN jsonb_build_object(
    'id', v_q.id,
    'quotation_number', v_q.quotation_number,
    'status', v_q.status,
    'subtotal', v_q.subtotal,
    'discount', v_q.discount,
    'vat_rate', v_q.vat_rate,
    'vat_amount', v_q.vat_amount,
    'total', v_q.total,
    'contract_months', v_q.contract_months,
    'terms', v_q.terms,
    'notes', v_q.notes,
    'sent_at', v_q.sent_at,
    'viewed_at', v_q.viewed_at,
    'accepted_at', v_q.accepted_at,
    'created_at', v_q.created_at,
    'brand_name', v_brand,
    'items', v_items,
    'can_accept', v_q.status::text IN ('sent', 'viewed')
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_public_quotation(p_token UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  SELECT q.id INTO v_id
  FROM public.quotations q
  WHERE q.public_token = p_token;

  IF v_id IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN public.quotation_public_payload(v_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_quotation_viewed(p_token UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.quotations%ROWTYPE;
BEGIN
  SELECT * INTO v_row
  FROM public.quotations
  WHERE public_token = p_token
  FOR UPDATE;

  IF NOT FOUND OR NOT public.quotation_public_visible(v_row.status) THEN
    RETURN NULL;
  END IF;

  IF v_row.status::text = 'sent' THEN
    UPDATE public.quotations
    SET
      status = 'viewed'::public.quotation_status,
      viewed_at = COALESCE(viewed_at, NOW()),
      updated_at = NOW()
    WHERE id = v_row.id;
  ELSIF v_row.viewed_at IS NULL THEN
    UPDATE public.quotations
    SET viewed_at = NOW(), updated_at = NOW()
    WHERE id = v_row.id;
  END IF;

  RETURN public.quotation_public_payload(v_row.id);
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_sales_quotation_accepted(p_quotation_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_q public.quotations%ROWTYPE;
  v_brand TEXT;
  v_dedupe TEXT;
BEGIN
  SELECT * INTO v_q FROM public.quotations WHERE id = p_quotation_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT l.brand_name INTO v_brand
  FROM public.leads l
  WHERE l.id = v_q.lead_id;

  v_dedupe := 'quotation-accepted-' || p_quotation_id::text;

  INSERT INTO public.user_notifications (
    user_id,
    dedupe_key,
    title,
    body,
    link,
    severity
  )
  VALUES (
    v_q.owner_id,
    v_dedupe,
    'ลูกค้ายอมรับใบเสนอราคา: ' || COALESCE(v_brand, v_q.quotation_number),
    'เลขที่ ' || v_q.quotation_number || ' — ติดตามชำระเงินและอัปเดตสถานะใน Sales',
    '/app/sales/quotations/' || p_quotation_id::text,
    'success'
  )
  ON CONFLICT (user_id, dedupe_key) DO UPDATE
    SET
      title = EXCLUDED.title,
      body = EXCLUDED.body,
      link = EXCLUDED.link,
      severity = EXCLUDED.severity,
      read_at = NULL,
      updated_at = NOW();
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_public_quotation(
  p_token UUID,
  p_accepted_by_name TEXT DEFAULT NULL,
  p_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.quotations%ROWTYPE;
BEGIN
  SELECT * INTO v_row
  FROM public.quotations
  WHERE public_token = p_token
  FOR UPDATE;

  IF NOT FOUND OR NOT public.quotation_public_visible(v_row.status) THEN
    RETURN NULL;
  END IF;

  IF v_row.status::text NOT IN ('sent', 'viewed') THEN
    RETURN public.quotation_public_payload(v_row.id);
  END IF;

  UPDATE public.quotations
  SET
    status = 'accepted'::public.quotation_status,
    viewed_at = COALESCE(viewed_at, NOW()),
    accepted_at = NOW(),
    updated_at = NOW()
  WHERE id = v_row.id;

  IF v_row.lead_id IS NOT NULL THEN
    UPDATE public.leads
    SET
      status = 'awaiting_payment',
      updated_at = NOW()
    WHERE id = v_row.lead_id
      AND status IN ('interested', 'scheduled', 'quotation_sent', 'follow_up');
  END IF;

  PERFORM public.notify_sales_quotation_accepted(v_row.id);

  RETURN public.quotation_public_payload(v_row.id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_quotation_public_token(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_quotation(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_quotation_viewed(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.accept_public_quotation(UUID, TEXT, TEXT) TO anon, authenticated;
