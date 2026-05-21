-- Phase 6 P2 hardening: enum compare แทน ::text + index ช่วย find_bank_match_for_line

-- 1) Index ช่วย join payments + quotations ใน find_bank_match_for_line:
--    where clause: p.status = 'pending' AND p.bank_matched_line_id IS NULL
--    + ใช้ p.created_at DESC ใน ORDER BY
CREATE INDEX IF NOT EXISTS payments_pending_unmatched_idx
  ON public.payments (created_at DESC)
  WHERE status = 'pending'::public.payment_status
    AND bank_matched_line_id IS NULL;

-- 2) Index บน quotations.status สำหรับ awaiting_payment (filter ปกติ)
CREATE INDEX IF NOT EXISTS quotations_awaiting_payment_idx
  ON public.quotations (id)
  WHERE status = 'awaiting_payment'::public.quotation_status;

-- 3) เปลี่ยน find_bank_match_for_line ให้ใช้ enum compare แทน ::text
CREATE OR REPLACE FUNCTION public.find_bank_match_for_line(p_line_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_line public.bank_statement_lines%ROWTYPE;
  v_s public.company_payment_settings%ROWTYPE;
  v_tol NUMERIC(12, 2);
  v_lookback INT;
  v_search TEXT;
  v_payment_id UUID;
  v_confidence NUMERIC(5, 4);
  v_qnum TEXT;
BEGIN
  SELECT * INTO v_line FROM public.bank_statement_lines WHERE id = p_line_id;
  IF NOT FOUND OR v_line.status <> 'unmatched' THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_s FROM public.company_payment_settings WHERE id = TRUE;
  v_tol := COALESCE(v_s.bank_match_amount_tolerance_baht, 1);
  v_lookback := COALESCE(v_s.bank_match_lookback_days, 14);
  v_search := LOWER(
    COALESCE(v_line.description, '') || ' ' || COALESCE(v_line.reference_text, '')
  );

  SELECT
    p.id,
    q.quotation_number,
    CASE
      WHEN ABS(p.total_amount - v_line.amount) <= v_tol
        AND v_search LIKE '%' || LOWER(q.quotation_number) || '%' THEN 0.95
      WHEN ABS(p.total_amount - v_line.amount) <= v_tol THEN 0.85
      WHEN ABS(q.total - v_line.amount) <= v_tol
        AND v_search LIKE '%' || LOWER(q.quotation_number) || '%' THEN 0.9
      ELSE 0.7
    END
  INTO v_payment_id, v_qnum, v_confidence
  FROM public.payments p
  JOIN public.quotations q ON q.id = p.quotation_id
  WHERE p.status = 'pending'::public.payment_status
    AND p.bank_matched_line_id IS NULL
    AND q.status = 'awaiting_payment'::public.quotation_status
    AND v_line.transaction_date >= (CURRENT_DATE - v_lookback)
    AND (
      ABS(p.total_amount - v_line.amount) <= v_tol
      OR ABS(q.total - v_line.amount) <= v_tol
    )
  ORDER BY v_confidence DESC, p.created_at DESC
  LIMIT 1;

  IF v_payment_id IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'payment_id', v_payment_id,
    'quotation_number', v_qnum,
    'confidence', v_confidence
  );
END;
$$;

-- 4) confirm_payment_bank_match: ใช้ enum compare แทน ::text (ยังคงพฤติกรรมจาก 00097)
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

  IF v_p.status = 'paid'::public.payment_status THEN
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

  IF v_p.status <> 'pending'::public.payment_status THEN
    RAISE EXCEPTION 'รายการชำระไม่พร้อมยืนยัน';
  END IF;

  IF v_p.verification_status = 'verifying'::public.payment_verification_status THEN
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

-- 5) advance_stale_payment_verifications: ใช้ enum compare (จาก 00098 ใช้ ::text บางจุด)
--    ที่จริง 00098 ใช้ enum compare แล้ว แต่ COALESCE(verification_decision, 'timeout') ยัง implicit cast TEXT
--    ตรงนี้ไม่เปลี่ยนเพื่อกัน regression เพราะ column เป็น TEXT อยู่แล้ว

-- 6) confirm_payment: ใช้ enum compare ทั้งหมด (00097 ยังคงใช้ ::text บางจุด)
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

  IF v_p.status = 'paid'::public.payment_status THEN
    RETURN;
  END IF;

  IF v_p.status <> 'pending'::public.payment_status THEN
    RAISE EXCEPTION 'รายการชำระไม่พร้อมยืนยัน';
  END IF;

  IF v_p.slip_path IS NOT NULL
    AND v_p.verification_status = 'verifying'::public.payment_verification_status THEN
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
