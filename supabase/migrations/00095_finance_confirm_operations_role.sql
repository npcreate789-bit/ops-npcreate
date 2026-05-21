-- Operations: ยืนยัน/ปฏิเสธสลิปให้สอดคล้องคิว Home

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
