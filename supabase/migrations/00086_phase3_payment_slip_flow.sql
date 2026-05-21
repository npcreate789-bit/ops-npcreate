-- Phase 3: sync สถานะหลังยอมรับ, payment draft, สลิปสาธารณะ, คิวตรวจสลิป

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS customer_slip_uploaded_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS payments_one_pending_per_quotation_idx
  ON public.payments (quotation_id)
  WHERE status = 'pending'::public.payment_status
    AND quotation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS payments_pending_slip_review_idx
  ON public.payments (customer_slip_uploaded_at DESC NULLS LAST)
  WHERE status = 'pending'::public.payment_status
    AND slip_path IS NOT NULL;

CREATE OR REPLACE FUNCTION public.ensure_customer_from_lead_internal(p_lead_id UUID)
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
  SET customer_id = v_customer_id, updated_at = NOW()
  WHERE id = p_lead_id;

  RETURN v_customer_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_payment_draft_for_quotation(
  p_quotation_id UUID,
  p_recorded_by UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_q public.quotations%ROWTYPE;
  v_customer_id UUID;
  v_payment_id UUID;
  v_service TEXT;
  v_amount NUMERIC(12, 2);
BEGIN
  SELECT * INTO v_q FROM public.quotations WHERE id = p_quotation_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quotation not found';
  END IF;

  SELECT p.id INTO v_payment_id
  FROM public.payments p
  WHERE p.quotation_id = p_quotation_id
    AND p.status = 'pending'::public.payment_status
  ORDER BY p.created_at DESC
  LIMIT 1;

  IF v_payment_id IS NOT NULL THEN
    RETURN v_payment_id;
  END IF;

  IF v_q.lead_id IS NULL THEN
    RAISE EXCEPTION 'ใบเสนอราคาไม่มี Lead — สร้างรายการชำระไม่ได้';
  END IF;

  v_customer_id := public.ensure_customer_from_lead_internal(v_q.lead_id);

  IF v_q.customer_id IS NULL THEN
    UPDATE public.quotations
    SET customer_id = v_customer_id, updated_at = NOW()
    WHERE id = p_quotation_id;
  END IF;

  SELECT COALESCE(
    NULLIF(TRIM(LEFT(string_agg(qi.description, ' · ' ORDER BY qi.sort_order, qi.id), 200)), ''),
    'ตามใบเสนอราคา ' || v_q.quotation_number
  )
  INTO v_service
  FROM public.quotation_items qi
  WHERE qi.quotation_id = p_quotation_id;

  v_amount := GREATEST(v_q.subtotal - COALESCE(v_q.discount, 0), 0);

  INSERT INTO public.payments (
    customer_id,
    quotation_id,
    recorded_by,
    service_type,
    amount,
    vat_amount,
    total_amount,
    status,
    notes
  ) VALUES (
    v_customer_id,
    p_quotation_id,
    COALESCE(p_recorded_by, v_q.owner_id),
    COALESCE(v_service, 'ตามใบเสนอราคา'),
    v_amount,
    v_q.vat_amount,
    v_q.total,
    'pending',
    'สร้างอัตโนมัติเมื่อส่งข้อมูลชำระเงิน · ' || v_q.quotation_number
  )
  RETURNING id INTO v_payment_id;

  RETURN v_payment_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_payment_slip_pending_review(p_payment_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_p public.payments%ROWTYPE;
  v_brand TEXT;
  v_qnum TEXT;
  v_title TEXT;
  v_body TEXT;
  v_link TEXT;
  v_recipient UUID;
BEGIN
  SELECT * INTO v_p FROM public.payments WHERE id = p_payment_id;
  IF NOT FOUND OR v_p.slip_path IS NULL THEN
    RETURN;
  END IF;

  SELECT c.brand_name INTO v_brand FROM public.customers c WHERE c.id = v_p.customer_id;
  SELECT q.quotation_number INTO v_qnum
  FROM public.quotations q
  WHERE q.id = v_p.quotation_id;

  v_title := 'ลูกค้าส่งสลิปชำระเงิน: ' || COALESCE(v_brand, 'ลูกค้า');
  v_body :=
    COALESCE(v_qnum, 'รายการชำระ')
    || ' · ยอด ' || to_char(v_p.total_amount, 'FM999,999,990.00') || ' บาท — รอตรวจสอบ';
  v_link := '/app/finance/payments/' || p_payment_id::text;

  FOR v_recipient IN
    SELECT DISTINCT ur.user_id
    FROM public.user_roles ur
    WHERE ur.role IN (
      'admin'::public.app_role,
      'ceo'::public.app_role,
      'operations'::public.app_role,
      'account'::public.app_role
    )
  LOOP
    INSERT INTO public.user_notifications (
      user_id,
      dedupe_key,
      title,
      body,
      link,
      severity
    )
    VALUES (
      v_recipient,
      'payment-slip-pending-' || p_payment_id::text || '-' || v_recipient::text,
      v_title,
      v_body,
      v_link,
      'warn'
    )
    ON CONFLICT (user_id, dedupe_key) DO UPDATE
      SET
        title = EXCLUDED.title,
        body = EXCLUDED.body,
        link = EXCLUDED.link,
        severity = EXCLUDED.severity,
        read_at = NULL,
        updated_at = NOW();
  END LOOP;
END;
$$;

-- ลูกค้ายอมรับ → Lead ยัง quotation_sent (รอทีมส่งบัญชีก่อน awaiting_payment)
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
      status = 'quotation_sent'::public.lead_status,
      updated_at = NOW()
    WHERE id = v_row.lead_id
      AND status IN (
        'interested'::public.lead_status,
        'scheduled'::public.lead_status,
        'follow_up'::public.lead_status,
        'awaiting_payment'::public.lead_status
      );
  END IF;

  PERFORM public.notify_sales_quotation_accepted(v_row.id);

  RETURN public.quotation_public_payload(v_row.id);
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
  v_can_slip BOOLEAN := FALSE;
  v_slip_submitted BOOLEAN := FALSE;
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

  IF v_q.status::text = 'awaiting_payment' THEN
    SELECT
      TRUE,
      (p.slip_path IS NOT NULL)
    INTO v_can_slip, v_slip_submitted
    FROM public.payments p
    WHERE p.quotation_id = p_quotation_id
      AND p.status = 'pending'::public.payment_status
    ORDER BY p.created_at DESC
    LIMIT 1;
    v_can_slip := COALESCE(v_can_slip, FALSE);
    v_slip_submitted := COALESCE(v_slip_submitted, FALSE);
  END IF;

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
    'can_accept', v_q.status::text IN ('sent', 'viewed'),
    'can_upload_slip', v_can_slip AND NOT v_slip_submitted,
    'slip_submitted', v_slip_submitted
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_quotation_payment_instructions_sent(p_quotation_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.quotations%ROWTYPE;
  v_uid UUID := auth.uid();
  v_payment_id UUID;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_row
  FROM public.quotations
  WHERE id = p_quotation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quotation not found';
  END IF;

  IF v_row.status::text <> 'accepted' THEN
    RAISE EXCEPTION 'ใบเสนอราคาต้องอยู่สถานะยอมรับแล้วจึงจะบันทึกการส่งข้อมูลชำระเงินได้';
  END IF;

  IF NOT (
    public.is_privileged()
    OR public.has_role('admin')
    OR public.has_role('account')
    OR v_row.owner_id = v_uid
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.quotations
  SET
    status = 'awaiting_payment'::public.quotation_status,
    payment_instructions_sent_at = NOW(),
    payment_instructions_sent_by = v_uid,
    updated_at = NOW()
  WHERE id = p_quotation_id;

  IF v_row.lead_id IS NOT NULL THEN
    UPDATE public.leads
    SET
      status = 'awaiting_payment'::public.lead_status,
      updated_at = NOW()
    WHERE id = v_row.lead_id;
  END IF;

  v_payment_id := public.ensure_payment_draft_for_quotation(p_quotation_id, v_uid);

  RETURN jsonb_build_object(
    'ok', TRUE,
    'quotation_id', p_quotation_id,
    'status', 'awaiting_payment',
    'payment_id', v_payment_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.quotation_public_slip_upload_allowed(p_token UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.quotations q
    JOIN public.payments p ON p.quotation_id = q.id
    WHERE q.public_token = p_token
      AND q.status = 'awaiting_payment'::public.quotation_status
      AND p.status = 'pending'::public.payment_status
  );
$$;

CREATE OR REPLACE FUNCTION public.register_public_payment_slip(
  p_token UUID,
  p_storage_path TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_q public.quotations%ROWTYPE;
  v_payment_id UUID;
  v_parts TEXT[];
BEGIN
  IF p_storage_path IS NULL OR TRIM(p_storage_path) = '' THEN
    RAISE EXCEPTION 'ไม่พบ path ของไฟล์สลิป';
  END IF;

  v_parts := string_to_array(p_storage_path, '/');
  IF COALESCE(array_length(v_parts, 1), 0) < 3
    OR v_parts[1] <> 'public'
    OR v_parts[2] <> p_token::text THEN
    RAISE EXCEPTION 'path สลิปไม่ถูกต้อง';
  END IF;

  SELECT * INTO v_q
  FROM public.quotations
  WHERE public_token = p_token
  FOR UPDATE;

  IF NOT FOUND OR v_q.status::text <> 'awaiting_payment' THEN
    RAISE EXCEPTION 'ไม่สามารถอัปโหลดสลิปในสถานะนี้ได้';
  END IF;

  SELECT p.id INTO v_payment_id
  FROM public.payments p
  WHERE p.quotation_id = v_q.id
    AND p.status = 'pending'::public.payment_status
  ORDER BY p.created_at DESC
  LIMIT 1;

  IF v_payment_id IS NULL THEN
    v_payment_id := public.ensure_payment_draft_for_quotation(v_q.id, v_q.owner_id);
  END IF;

  UPDATE public.payments
  SET
    slip_path = p_storage_path,
    customer_slip_uploaded_at = NOW(),
    updated_at = NOW()
  WHERE id = v_payment_id;

  PERFORM public.notify_payment_slip_pending_review(v_payment_id);

  RETURN jsonb_build_object(
    'ok', TRUE,
    'payment_id', v_payment_id,
    'quotation_id', v_q.id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.can_view_payment_slip_review_queue()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_privileged()
    OR public.has_role('admin')
    OR public.has_role('account');
$$;

CREATE OR REPLACE FUNCTION public.list_payments_pending_slip_review()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows JSONB;
BEGIN
  IF auth.uid() IS NULL OR NOT public.can_view_payment_slip_review_queue() THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT COALESCE(
    jsonb_agg(row_to_json(t)::jsonb ORDER BY t.customer_slip_uploaded_at DESC NULLS LAST),
    '[]'::jsonb
  )
  INTO v_rows
  FROM (
    SELECT
      p.id,
      p.customer_id,
      p.quotation_id,
      p.total_amount,
      p.slip_path,
      p.customer_slip_uploaded_at,
      p.created_at,
      c.brand_name AS customer_brand_name,
      q.quotation_number
    FROM public.payments p
    LEFT JOIN public.customers c ON c.id = p.customer_id
    LEFT JOIN public.quotations q ON q.id = p.quotation_id
    WHERE p.status = 'pending'::public.payment_status
      AND p.slip_path IS NOT NULL
    LIMIT 30
  ) t;

  RETURN v_rows;
END;
$$;

DROP POLICY IF EXISTS payments_public_slip_insert ON storage.objects;

CREATE POLICY payments_public_slip_insert ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    bucket_id = 'payments'
    AND (storage.foldername(name))[1] = 'public'
    AND public.quotation_public_slip_upload_allowed(
      ((storage.foldername(name))[2])::uuid
    )
  );

GRANT EXECUTE ON FUNCTION public.register_public_payment_slip(UUID, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.quotation_public_slip_upload_allowed(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_payments_pending_slip_review() TO authenticated;
