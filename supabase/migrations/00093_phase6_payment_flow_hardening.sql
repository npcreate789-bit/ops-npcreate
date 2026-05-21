-- Phase 6: hardening payment flow (security, roles, OCR rules, bank LINE ids)

-- 1) Public slip: block re-upload while verifying / review
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
  LIMIT 1;

  IF v_payment_id IS NULL THEN
    v_payment_id := public.ensure_payment_draft_for_quotation(v_q.id, v_q.owner_id);
    v_verification := 'none';
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

-- 2) Staff slip upload → same verifying pipeline as public
CREATE OR REPLACE FUNCTION public.register_staff_payment_slip(
  p_payment_id UUID,
  p_storage_path TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_p public.payments%ROWTYPE;
BEGIN
  IF NOT (
    public.is_privileged()
    OR public.has_role('admin')
    OR public.has_role('account')
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_storage_path IS NULL OR TRIM(p_storage_path) = '' THEN
    RAISE EXCEPTION 'ไม่พบ path ของไฟล์สลิป';
  END IF;

  SELECT * INTO v_p FROM public.payments WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND OR v_p.status::text <> 'pending' THEN
    RAISE EXCEPTION 'รายการชำระไม่พร้อมแนบสลิป';
  END IF;

  IF v_p.verification_status::text NOT IN ('none', 'review_required') THEN
    RAISE EXCEPTION 'มีสลิปกำลังตรวจอยู่ — รอผลตรวจก่อนแนบใหม่';
  END IF;

  UPDATE public.payments
  SET
    slip_path = p_storage_path,
    customer_slip_uploaded_at = COALESCE(customer_slip_uploaded_at, NOW()),
    verification_status = 'verifying'::public.payment_verification_status,
    verification_started_at = NOW(),
    verification_result = NULL,
    verification_decision = NULL,
    slip_detected_amount = NULL,
    verification_confidence = NULL,
    updated_at = NOW()
  WHERE id = p_payment_id;

  RETURN jsonb_build_object(
    'ok', TRUE,
    'payment_id', p_payment_id,
    'verification_status', 'verifying'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_staff_payment_slip(UUID, TEXT) TO authenticated;

-- 3) OCR auto-pass: honor require_reference_match (remove redundant OR)
CREATE OR REPLACE FUNCTION public.apply_payment_slip_verification(
  p_payment_id UUID,
  p_ocr JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_p public.payments%ROWTYPE;
  v_q public.quotations%ROWTYPE;
  v_s public.company_payment_settings%ROWTYPE;
  v_expected NUMERIC(12, 2);
  v_detected NUMERIC(12, 2);
  v_confidence NUMERIC(5, 4);
  v_ref_text TEXT;
  v_transfer_date DATE;
  v_reasons TEXT[] := ARRAY[]::TEXT[];
  v_auto_pass BOOLEAN := FALSE;
  v_decision TEXT;
  v_ref_ok BOOLEAN;
  v_date_ok BOOLEAN;
  v_amount_ok BOOLEAN;
  v_ocr_error TEXT;
BEGIN
  IF COALESCE(auth.jwt() ->> 'role', '') <> 'service_role' THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT * INTO v_p FROM public.payments WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found';
  END IF;

  IF v_p.status::text <> 'pending' OR v_p.verification_status::text <> 'verifying' THEN
    RETURN jsonb_build_object(
      'ok', FALSE,
      'skipped', TRUE,
      'reason', 'not_verifying'
    );
  END IF;

  SELECT * INTO v_s FROM public.company_payment_settings WHERE id = TRUE;

  IF v_p.quotation_id IS NOT NULL THEN
    SELECT * INTO v_q FROM public.quotations WHERE id = v_p.quotation_id;
    v_expected := v_q.total;
  ELSE
    v_expected := v_p.total_amount;
  END IF;

  v_detected := NULLIF((p_ocr ->> 'detected_amount')::NUMERIC, 0);
  v_confidence := LEAST(1, GREATEST(0, COALESCE((p_ocr ->> 'confidence')::NUMERIC, 0)));
  v_ref_text := LOWER(COALESCE(p_ocr ->> 'reference_text', ''));
  v_ocr_error := NULLIF(TRIM(p_ocr ->> 'error'), '');

  BEGIN
    v_transfer_date := NULLIF(p_ocr ->> 'transfer_date', '')::DATE;
  EXCEPTION
    WHEN OTHERS THEN
      v_transfer_date := NULL;
  END;

  UPDATE public.payments
  SET
    slip_detected_amount = v_detected,
    verification_confidence = v_confidence,
    verification_result = p_ocr,
    updated_at = NOW()
  WHERE id = p_payment_id;

  IF v_ocr_error IS NOT NULL THEN
    v_reasons := array_append(v_reasons, v_ocr_error);
  END IF;

  IF v_detected IS NULL THEN
    v_reasons := array_append(v_reasons, 'ไม่พบยอดเงินบนสลิป');
  END IF;

  v_amount_ok := v_detected IS NOT NULL
    AND ABS(v_detected - v_expected) <= COALESCE(v_s.amount_tolerance_baht, 1);

  IF NOT v_amount_ok AND v_detected IS NOT NULL THEN
    v_reasons := array_append(
      v_reasons,
      'ยอดสลิป ' || to_char(v_detected, 'FM999,999,990.00')
        || ' ไม่ตรงใบ ' || to_char(v_expected, 'FM999,999,990.00')
    );
  END IF;

  v_ref_ok := TRUE;
  IF COALESCE(v_s.require_reference_match, TRUE) AND v_q.quotation_number IS NOT NULL THEN
    v_ref_ok := v_ref_text LIKE '%' || LOWER(v_q.quotation_number) || '%';
    IF NOT v_ref_ok THEN
      v_reasons := array_append(v_reasons, 'ไม่พบเลขที่ใบเสนอราคาบนสลิป');
    END IF;
  END IF;

  v_date_ok := v_transfer_date IS NULL
    OR v_transfer_date BETWEEN (CURRENT_DATE - 1) AND CURRENT_DATE;

  IF NOT v_date_ok THEN
    v_reasons := array_append(v_reasons, 'วันที่โอนไม่ใช่วันนี้หรือเมื่อวาน');
  END IF;

  IF v_expected >= COALESCE(v_s.manual_review_min_amount, 100000) THEN
    v_reasons := array_append(
      v_reasons,
      'ยอดเกินเกณฑ์บังคับตรวจมือ (' || to_char(v_s.manual_review_min_amount, 'FM999,999,990') || ')'
    );
  END IF;

  IF COALESCE(v_s.auto_confirm_enabled, FALSE)
    AND v_amount_ok
    AND v_date_ok
    AND v_confidence >= 0.75
    AND v_expected <= COALESCE(v_s.auto_confirm_max_amount, 50000)
    AND (
      NOT COALESCE(v_s.require_reference_match, TRUE)
      OR v_ref_ok
    )
    AND v_expected < COALESCE(v_s.manual_review_min_amount, 100000)
    AND v_ocr_error IS NULL THEN
    v_auto_pass := TRUE;
  END IF;

  IF v_auto_pass THEN
    v_decision := 'auto_pass';
    PERFORM public.confirm_payment_internal(p_payment_id);
    PERFORM public.notify_payment_auto_confirmed_staff(p_payment_id, v_p.quotation_id);
  ELSE
    v_decision := 'review_required';
    UPDATE public.payments
    SET
      verification_status = 'review_required'::public.payment_verification_status,
      verification_decision = v_decision,
      updated_at = NOW()
    WHERE id = p_payment_id;

    PERFORM public.notify_payment_slip_pending_review(p_payment_id);
  END IF;

  UPDATE public.payments
  SET
    verification_decision = v_decision,
    verification_result = COALESCE(verification_result, '{}'::jsonb)
      || jsonb_build_object('reasons', to_jsonb(v_reasons))
  WHERE id = p_payment_id;

  RETURN jsonb_build_object(
    'ok', TRUE,
    'payment_id', p_payment_id,
    'decision', v_decision,
    'auto_pass', v_auto_pass,
    'expected_amount', v_expected,
    'detected_amount', v_detected,
    'confidence', v_confidence,
    'reasons', to_jsonb(v_reasons)
  );
END;
$$;

-- 4) Finance confirm/reject: include account role
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
    ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT * INTO v_p FROM public.payments WHERE id = p_payment_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found';
  END IF;

  IF v_p.status::text <> 'pending' THEN
    RAISE EXCEPTION 'รายการชำระไม่พร้อมยืนยัน';
  END IF;

  IF v_p.slip_path IS NOT NULL
    AND v_p.verification_status::text IN ('verifying') THEN
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

-- 5) Bank matching: return auto-confirmed payment ids; dedupe staff notify
CREATE OR REPLACE FUNCTION public.run_bank_payment_matching(p_import_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_line_id UUID;
  v_match JSONB;
  v_matched INT := 0;
  v_auto INT := 0;
  v_auto_ids UUID[] := ARRAY[]::UUID[];
  v_pay_id UUID;
  v_s public.company_payment_settings%ROWTYPE;
BEGIN
  IF v_uid IS NULL AND COALESCE(auth.jwt() ->> 'role', '') <> 'service_role' THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT * INTO v_s FROM public.company_payment_settings WHERE id = TRUE;

  FOR v_line_id IN
    SELECT b.id
    FROM public.bank_statement_lines b
    WHERE b.status = 'unmatched'
      AND (p_import_id IS NULL OR b.import_id = p_import_id)
    ORDER BY b.transaction_date DESC
    LIMIT 200
  LOOP
    v_match := public.find_bank_match_for_line(v_line_id);
    IF v_match IS NULL THEN
      CONTINUE;
    END IF;

    v_pay_id := (v_match ->> 'payment_id')::UUID;

    IF COALESCE(v_s.bank_match_auto_confirm_enabled, FALSE)
      AND (v_match ->> 'confidence')::NUMERIC >= 0.9 THEN
      PERFORM public.confirm_payment_bank_match(v_line_id, v_pay_id, TRUE);
      v_auto := v_auto + 1;
      v_auto_ids := array_append(v_auto_ids, v_pay_id);
    ELSE
      UPDATE public.bank_statement_lines
      SET
        match_notes = 'แนะนำจับคู่ ' || COALESCE(v_match ->> 'quotation_number', '')
          || ' (ความมั่นใจ ' || ROUND((v_match ->> 'confidence')::NUMERIC * 100) || '%)',
        match_confidence = (v_match ->> 'confidence')::NUMERIC
      WHERE id = v_line_id;
      v_matched := v_matched + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', TRUE,
    'suggested', v_matched,
    'auto_confirmed', v_auto,
    'auto_confirmed_payment_ids', to_jsonb(v_auto_ids)
  );
END;
$$;

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
    AND NOT (public.is_privileged() OR public.has_role('admin') OR public.has_role('account')) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT * INTO v_line FROM public.bank_statement_lines WHERE id = p_line_id FOR UPDATE;
  IF NOT FOUND OR v_line.status = 'matched' THEN
    RAISE EXCEPTION 'รายการธนาคารไม่พร้อมจับคู่';
  END IF;

  SELECT * INTO v_p FROM public.payments WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND OR v_p.status::text <> 'pending' THEN
    RAISE EXCEPTION 'รายการชำระไม่พร้อมยืนยัน';
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

-- 6) Public payload: expose pending payment id for LINE notify on poll
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
      p.id
    INTO v_verification, v_can_slip, v_slip_submitted, v_pending_payment_id
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
      ELSE NULL
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
    'pending_payment_id', v_pending_payment_id
  );
END;
$$;
