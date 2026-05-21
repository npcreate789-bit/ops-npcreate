-- Phase 4: ปิด loop ชำระเงิน — sync ใบเสนอราคา/Lead, แจ้ง viewed/confirmed, idempotent mark sent

CREATE OR REPLACE FUNCTION public.notify_quotation_viewed_staff(p_quotation_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_q public.quotations%ROWTYPE;
  v_brand TEXT;
  v_title TEXT;
  v_body TEXT;
  v_link TEXT;
  v_recipient UUID;
BEGIN
  SELECT * INTO v_q FROM public.quotations WHERE id = p_quotation_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT l.brand_name INTO v_brand
  FROM public.leads l
  WHERE l.id = v_q.lead_id;

  v_title := 'ลูกค้าเปิดดูใบเสนอราคา: ' || COALESCE(v_brand, v_q.quotation_number);
  v_body := 'เลขที่ ' || v_q.quotation_number || ' — ติดตามหรือรอการยอมรับ';
  v_link := '/app/sales/quotations/' || p_quotation_id::text;

  FOR v_recipient IN
    SELECT DISTINCT r.user_id
    FROM (
      SELECT v_q.owner_id AS user_id
      WHERE v_q.owner_id IS NOT NULL
      UNION
      SELECT ur.user_id
      FROM public.user_roles ur
      WHERE ur.role IN (
        'admin'::public.app_role,
        'ceo'::public.app_role,
        'operations'::public.app_role
      )
    ) r
    WHERE r.user_id IS NOT NULL
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
      'quotation-viewed-' || p_quotation_id::text || '-' || v_recipient::text,
      v_title,
      v_body,
      v_link,
      'info'
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

CREATE OR REPLACE FUNCTION public.notify_payment_confirmed_staff(
  p_payment_id UUID,
  p_quotation_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_q public.quotations%ROWTYPE;
  v_p public.payments%ROWTYPE;
  v_brand TEXT;
  v_title TEXT;
  v_body TEXT;
  v_link TEXT;
  v_recipient UUID;
BEGIN
  SELECT * INTO v_p FROM public.payments WHERE id = p_payment_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF p_quotation_id IS NOT NULL THEN
    SELECT * INTO v_q FROM public.quotations WHERE id = p_quotation_id;
  END IF;

  SELECT c.brand_name INTO v_brand FROM public.customers c WHERE c.id = v_p.customer_id;

  v_title := 'ปิดการขาย · ชำระเงินแล้ว: ' || COALESCE(v_brand, v_q.quotation_number, 'ลูกค้า');
  v_body :=
    COALESCE(v_q.quotation_number, 'รายการชำระ')
    || ' · ' || to_char(v_p.total_amount, 'FM999,999,990.00') || ' บาท — เริ่ม Onboarding ได้';
  v_link := COALESCE(
    '/app/sales/quotations/' || p_quotation_id::text,
    '/app/finance/payments/' || p_payment_id::text
  );

  FOR v_recipient IN
    SELECT DISTINCT r.user_id
    FROM (
      SELECT v_q.owner_id AS user_id
      WHERE v_q.owner_id IS NOT NULL
      UNION
      SELECT ur.user_id
      FROM public.user_roles ur
      WHERE ur.role IN (
        'admin'::public.app_role,
        'ceo'::public.app_role,
        'operations'::public.app_role,
        'account'::public.app_role
      )
    ) r
    WHERE r.user_id IS NOT NULL
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
      'payment-confirmed-' || p_payment_id::text || '-' || v_recipient::text,
      v_title,
      v_body,
      v_link,
      'info'
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

CREATE OR REPLACE FUNCTION public.confirm_payment(p_payment_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment public.payments%ROWTYPE;
  v_months INT;
  v_lead_id UUID;
BEGIN
  IF NOT (public.is_privileged() OR public.has_role('admin')) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT * INTO v_payment FROM public.payments WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found';
  END IF;

  IF v_payment.status = 'paid' AND v_payment.confirmed_at IS NOT NULL THEN
    RETURN;
  END IF;

  UPDATE public.payments
  SET
    status = 'paid',
    payment_date = COALESCE(v_payment.payment_date, CURRENT_DATE),
    confirmed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_payment_id;

  v_months := NULL;

  IF v_payment.quotation_id IS NOT NULL THEN
    UPDATE public.quotations
    SET
      status = 'paid'::public.quotation_status,
      paid_at = COALESCE(paid_at, NOW()),
      updated_at = NOW()
    WHERE id = v_payment.quotation_id
      AND status::text <> 'paid';

    SELECT q.lead_id, q.contract_months
    INTO v_lead_id, v_months
    FROM public.quotations q
    WHERE q.id = v_payment.quotation_id;

    IF v_lead_id IS NOT NULL THEN
      UPDATE public.leads
      SET
        status = 'won'::public.lead_status,
        converted_at = COALESCE(converted_at, NOW()),
        updated_at = NOW()
      WHERE id = v_lead_id;
    END IF;
  END IF;

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

  PERFORM public.ensure_onboarding_checklist(v_payment.customer_id);
  PERFORM public.refresh_customer_ready_for_ads(v_payment.customer_id);

  IF v_payment.quotation_id IS NOT NULL THEN
    PERFORM public.notify_payment_confirmed_staff(p_payment_id, v_payment.quotation_id);
  ELSE
    PERFORM public.notify_payment_confirmed_staff(p_payment_id, NULL);
  END IF;
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
  v_notify BOOLEAN := FALSE;
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
    v_notify := TRUE;
  ELSIF v_row.viewed_at IS NULL THEN
    UPDATE public.quotations
    SET viewed_at = NOW(), updated_at = NOW()
    WHERE id = v_row.id;
    IF v_row.status::text IN ('sent', 'viewed') THEN
      v_notify := TRUE;
    END IF;
  END IF;

  IF v_notify THEN
    PERFORM public.notify_quotation_viewed_staff(v_row.id);
  END IF;

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
    'paid_at', v_q.paid_at,
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

  IF NOT (
    public.is_privileged()
    OR public.has_role('admin')
    OR public.has_role('account')
    OR v_row.owner_id = v_uid
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF v_row.status::text = 'awaiting_payment'
    AND v_row.payment_instructions_sent_at IS NOT NULL THEN
    v_payment_id := public.ensure_payment_draft_for_quotation(p_quotation_id, v_uid);
    RETURN jsonb_build_object(
      'ok', TRUE,
      'quotation_id', p_quotation_id,
      'status', 'awaiting_payment',
      'payment_id', v_payment_id,
      'already_sent', TRUE
    );
  END IF;

  IF v_row.status::text <> 'accepted' THEN
    RAISE EXCEPTION 'ใบเสนอราคาต้องอยู่สถานะยอมรับแล้วจึงจะบันทึกการส่งข้อมูลชำระเงินได้';
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
    'payment_id', v_payment_id,
    'already_sent', FALSE
  );
END;
$$;
