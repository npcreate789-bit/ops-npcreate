-- Phase 6 P0 hardening: race conditions, idempotency, reject visibility, bank guard

-- 1) คอลัมน์เก็บข้อมูล reject สลิป (ค้างไว้ให้หน้า /q แสดงผล)
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS slip_rejected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS slip_rejected_note TEXT;

-- 2) confirm_payment: FOR UPDATE + idempotent บน paid + guard verifying
CREATE OR REPLACE FUNCTION public.confirm_payment(p_payment_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quotation_id UUID;
  v_p public.payments%ROWTYPE;
BEGIN
  IF COALESCE(auth.jwt() ->> 'role', '') <> 'service_role'
    AND NOT (
      public.is_privileged()
      OR public.has_role('admin')
      OR public.has_role('account')
      OR public.has_role('operations')
    ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT * INTO v_p FROM public.payments WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found';
  END IF;

  IF v_p.status::text = 'paid' THEN
    RETURN;
  END IF;

  IF v_p.status::text <> 'pending' THEN
    RAISE EXCEPTION 'รายการชำระไม่พร้อมยืนยัน';
  END IF;

  IF v_p.slip_path IS NOT NULL
    AND v_p.verification_status::text = 'verifying' THEN
    RAISE EXCEPTION 'รอผลตรวจสลิปอัตโนมัติก่อนยืนยัน — หรือปฏิเสธสลิป';
  END IF;

  v_quotation_id := v_p.quotation_id;
  PERFORM public.confirm_payment_internal(p_payment_id);

  IF v_quotation_id IS NOT NULL THEN
    PERFORM public.notify_payment_confirmed_staff(p_payment_id, v_quotation_id);
  ELSE
    PERFORM public.notify_payment_confirmed_staff(p_payment_id, NULL);
  END IF;
END;
$$;

-- 3) register_public_payment_slip: lock payment row + clear reject markers ตอน upload ใหม่
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
  v_verification TEXT;
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

  SELECT p.id, p.verification_status::text
  INTO v_payment_id, v_verification
  FROM public.payments p
  WHERE p.quotation_id = v_q.id
    AND p.status = 'pending'::public.payment_status
  ORDER BY p.created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF v_payment_id IS NULL THEN
    v_payment_id := public.ensure_payment_draft_for_quotation(v_q.id, v_q.owner_id);
    v_verification := 'none';
    PERFORM 1 FROM public.payments WHERE id = v_payment_id FOR UPDATE;
  END IF;

  IF COALESCE(v_verification, 'none') NOT IN ('none') THEN
    RAISE EXCEPTION 'มีสลิปรอตรวจอยู่แล้ว — รอทีมงานยืนยันหรือปฏิเสธก่อนอัปโหลดใหม่';
  END IF;

  UPDATE public.payments
  SET
    slip_path = p_storage_path,
    customer_slip_uploaded_at = NOW(),
    verification_status = 'verifying'::public.payment_verification_status,
    verification_started_at = NOW(),
    verification_result = NULL,
    verification_decision = NULL,
    slip_detected_amount = NULL,
    verification_confidence = NULL,
    slip_rejected_at = NULL,
    slip_rejected_note = NULL,
    updated_at = NOW()
  WHERE id = v_payment_id;

  RETURN jsonb_build_object(
    'ok', TRUE,
    'payment_id', v_payment_id,
    'quotation_id', v_q.id,
    'verification_status', 'verifying'
  );
END;
$$;

-- 4) reject_payment_customer_slip: เก็บ rejected_at / note ให้ /q เห็น
CREATE OR REPLACE FUNCTION public.reject_payment_customer_slip(
  p_payment_id UUID,
  p_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_p public.payments%ROWTYPE;
  v_q public.quotations%ROWTYPE;
  v_note TEXT;
BEGIN
  IF NOT (
    public.is_privileged()
    OR public.has_role('admin')
    OR public.has_role('account')
    OR public.has_role('operations')
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT * INTO v_p FROM public.payments WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found';
  END IF;

  IF v_p.status::text <> 'pending' OR v_p.slip_path IS NULL THEN
    RAISE EXCEPTION 'ไม่มีสลิปรอตรวจในสถานะนี้';
  END IF;

  v_note := COALESCE(NULLIF(TRIM(p_note), ''), 'ไม่ระบุเหตุผล');

  UPDATE public.payments
  SET
    slip_path = NULL,
    customer_slip_uploaded_at = NULL,
    verification_status = 'none'::public.payment_verification_status,
    verification_started_at = NULL,
    verification_result = NULL,
    verification_decision = NULL,
    slip_detected_amount = NULL,
    verification_confidence = NULL,
    slip_rejected_at = NOW(),
    slip_rejected_note = v_note,
    notes = TRIM(
      COALESCE(notes || E'\n', '')
      || '[สลิปไม่ผ่าน '
      || to_char(NOW() AT TIME ZONE 'Asia/Bangkok', 'DD/MM/YYYY HH24:MI')
      || '] '
      || v_note
    ),
    updated_at = NOW()
  WHERE id = p_payment_id;

  IF v_p.quotation_id IS NOT NULL THEN
    SELECT * INTO v_q FROM public.quotations WHERE id = v_p.quotation_id;
  END IF;

  RETURN jsonb_build_object(
    'ok', TRUE,
    'payment_id', p_payment_id,
    'quotation_id', v_p.quotation_id,
    'public_token', v_q.public_token,
    'lead_id', v_q.lead_id
  );
END;
$$;

-- 5) confirm_payment_bank_match: guard verifying + operations + idempotent paid
CREATE OR REPLACE FUNCTION public.confirm_payment_bank_match(
  p_line_id UUID,
  p_payment_id UUID,
  p_auto BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_line public.bank_statement_lines%ROWTYPE;
  v_p public.payments%ROWTYPE;
  v_tol NUMERIC(12, 2);
  v_q public.quotations%ROWTYPE;
BEGIN
  IF COALESCE(auth.jwt() ->> 'role', '') <> 'service_role'
    AND NOT (
      public.is_privileged()
      OR public.has_role('admin')
      OR public.has_role('account')
      OR public.has_role('operations')
    ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT * INTO v_line FROM public.bank_statement_lines WHERE id = p_line_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ไม่พบรายการธนาคาร';
  END IF;
  IF v_line.status = 'matched' THEN
    RETURN jsonb_build_object(
      'ok', TRUE,
      'payment_id', v_line.payment_id,
      'line_id', p_line_id,
      'auto', p_auto,
      'skipped', TRUE,
      'reason', 'line_already_matched'
    );
  END IF;

  SELECT * INTO v_p FROM public.payments WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'รายการชำระไม่พร้อมยืนยัน';
  END IF;

  -- paid อยู่แล้ว: mark line matched แล้วจบ (ไม่ raise ไม่ notify ซ้ำ)
  IF v_p.status::text = 'paid' THEN
    UPDATE public.bank_statement_lines
    SET
      status = 'matched',
      payment_id = p_payment_id,
      matched_at = NOW(),
      match_confidence = COALESCE(match_confidence, 1),
      match_notes = COALESCE(match_notes, '') ||
        CASE WHEN p_auto THEN ' [auto-already-paid]' ELSE ' [manual-already-paid]' END
    WHERE id = p_line_id;

    RETURN jsonb_build_object(
      'ok', TRUE,
      'payment_id', p_payment_id,
      'line_id', p_line_id,
      'auto', p_auto,
      'skipped', TRUE,
      'reason', 'payment_already_paid'
    );
  END IF;

  IF v_p.status::text <> 'pending' THEN
    RAISE EXCEPTION 'รายการชำระไม่พร้อมยืนยัน';
  END IF;

  -- ห้ามจับคู่บัญชีระหว่าง OCR ยังทำงาน (กัน bypass OCR)
  IF v_p.verification_status::text = 'verifying' THEN
    RAISE EXCEPTION 'สลิปกำลังตรวจอัตโนมัติ — รอผลตรวจก่อนจับคู่บัญชี';
  END IF;

  SELECT bank_match_amount_tolerance_baht INTO v_tol
  FROM public.company_payment_settings WHERE id = TRUE;

  IF v_p.quotation_id IS NOT NULL THEN
    SELECT * INTO v_q FROM public.quotations WHERE id = v_p.quotation_id;
  END IF;

  IF ABS(v_p.total_amount - v_line.amount) > COALESCE(v_tol, 1)
    AND (v_q.id IS NULL OR ABS(v_q.total - v_line.amount) > COALESCE(v_tol, 1)) THEN
    RAISE EXCEPTION 'ยอดธนาคารไม่ตรงกับรายการชำระ';
  END IF;

  UPDATE public.bank_statement_lines
  SET
    status = 'matched',
    payment_id = p_payment_id,
    matched_at = NOW(),
    match_confidence = COALESCE(match_confidence, 1),
    match_notes = COALESCE(match_notes, '') || CASE WHEN p_auto THEN ' [auto]' ELSE ' [manual]' END
  WHERE id = p_line_id;

  UPDATE public.payments
  SET
    bank_matched_line_id = p_line_id,
    bank_matched_at = NOW(),
    payment_date = COALESCE(payment_date, v_line.transaction_date),
    updated_at = NOW()
  WHERE id = p_payment_id;

  PERFORM public.confirm_payment_internal(p_payment_id);

  IF v_p.quotation_id IS NOT NULL THEN
    IF p_auto THEN
      PERFORM public.notify_payment_auto_confirmed_staff(p_payment_id, v_p.quotation_id);
    ELSE
      PERFORM public.notify_payment_confirmed_staff(p_payment_id, v_p.quotation_id);
    END IF;
  ELSE
    PERFORM public.notify_payment_confirmed_staff(p_payment_id, NULL);
  END IF;

  RETURN jsonb_build_object(
    'ok', TRUE,
    'payment_id', p_payment_id,
    'line_id', p_line_id,
    'auto', p_auto
  );
END;
$$;

-- 6) quotation_public_payload: ส่ง slip_rejected_at / note ให้ /q แสดง
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
  v_verification TEXT := 'none';
  v_payment_status_message TEXT := NULL;
  v_pending_payment_id UUID := NULL;
  v_verification_decision TEXT := NULL;
  v_slip_rejected_at TIMESTAMPTZ := NULL;
  v_slip_rejected_note TEXT := NULL;
BEGIN
  PERFORM public.advance_stale_payment_verifications(p_quotation_id);

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
      p.verification_status::text,
      (p.slip_path IS NULL),
      (p.slip_path IS NOT NULL),
      p.id,
      p.verification_decision,
      p.slip_rejected_at,
      p.slip_rejected_note
    INTO
      v_verification,
      v_can_slip,
      v_slip_submitted,
      v_pending_payment_id,
      v_verification_decision,
      v_slip_rejected_at,
      v_slip_rejected_note
    FROM public.payments p
    WHERE p.quotation_id = p_quotation_id
      AND p.status = 'pending'::public.payment_status
    ORDER BY p.created_at DESC
    LIMIT 1;

    v_verification := COALESCE(v_verification, 'none');
    v_can_slip := COALESCE(v_can_slip, TRUE);

    v_payment_status_message := CASE v_verification
      WHEN 'verifying' THEN 'กำลังตรวจสอบสลิปอัตโนมัติ — โปรดรอสักครู่'
      WHEN 'review_required' THEN 'ได้รับสลิปแล้ว — ทีมงานกำลังยืนยันการชำระเงิน'
      WHEN 'confirmed' THEN 'ยืนยันการชำระเงินแล้ว'
      ELSE
        CASE WHEN v_slip_rejected_at IS NOT NULL
          THEN 'สลิปไม่ผ่าน — กรุณาอัปโหลดสลิปใหม่'
          ELSE NULL
        END
    END;
  ELSIF v_q.status::text = 'paid' THEN
    v_verification := 'confirmed';
    v_payment_status_message := 'ยืนยันการชำระเงินแล้ว';
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
    'can_upload_slip', v_can_slip AND v_verification IN ('none'),
    'slip_submitted', v_slip_submitted,
    'payment_verification_status', v_verification,
    'payment_status_message', v_payment_status_message,
    'pending_payment_id', v_pending_payment_id,
    'payment_verification_decision', v_verification_decision,
    'slip_rejected_at', v_slip_rejected_at,
    'slip_rejected_note', v_slip_rejected_note
  );
END;
$$;
