-- Phase 6b: OCR สลิป + กฎ auto-confirm + เก็บผลตรวจ

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS slip_detected_amount NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS verification_confidence NUMERIC(5, 4),
  ADD COLUMN IF NOT EXISTS verification_result JSONB,
  ADD COLUMN IF NOT EXISTS verification_decision TEXT;

ALTER TABLE public.company_payment_settings
  ADD COLUMN IF NOT EXISTS auto_confirm_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS auto_confirm_max_amount NUMERIC(12, 2) NOT NULL DEFAULT 50000
    CHECK (auto_confirm_max_amount >= 0),
  ADD COLUMN IF NOT EXISTS amount_tolerance_baht NUMERIC(12, 2) NOT NULL DEFAULT 1
    CHECK (amount_tolerance_baht >= 0 AND amount_tolerance_baht <= 100),
  ADD COLUMN IF NOT EXISTS require_reference_match BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS manual_review_min_amount NUMERIC(12, 2) NOT NULL DEFAULT 100000
    CHECK (manual_review_min_amount >= 0);

CREATE OR REPLACE FUNCTION public.notify_payment_auto_confirmed_staff(
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

  v_title := 'ปิดการขายอัตโนมัติ: ' || COALESCE(v_brand, v_q.quotation_number, 'ลูกค้า');
  v_body :=
    COALESCE(v_q.quotation_number, 'รายการชำระ')
    || ' · ' || to_char(v_p.total_amount, 'FM999,999,990.00') || ' บาท — ตรวจสลิปผ่านอัตโนมัติ';
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
      'payment-auto-confirmed-' || p_payment_id::text || '-' || v_recipient::text,
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

CREATE OR REPLACE FUNCTION public.confirm_payment_internal(p_payment_id UUID)
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
    verification_status = 'confirmed'::public.payment_verification_status,
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
END;
$$;

CREATE OR REPLACE FUNCTION public.confirm_payment(p_payment_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quotation_id UUID;
BEGIN
  IF COALESCE(auth.jwt() ->> 'role', '') <> 'service_role'
    AND NOT (public.is_privileged() OR public.has_role('admin')) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT quotation_id INTO v_quotation_id
  FROM public.payments WHERE id = p_payment_id;

  PERFORM public.confirm_payment_internal(p_payment_id);

  IF v_quotation_id IS NOT NULL THEN
    PERFORM public.notify_payment_confirmed_staff(p_payment_id, v_quotation_id);
  ELSE
    PERFORM public.notify_payment_confirmed_staff(p_payment_id, NULL);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_company_payment_settings()
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'bank_name', s.bank_name,
    'account_number', s.account_number,
    'account_name', s.account_name,
    'promptpay_id', s.promptpay_id,
    'payment_instructions_sla_hours', s.payment_instructions_sla_hours,
    'payment_verification_seconds', s.payment_verification_seconds,
    'auto_confirm_enabled', s.auto_confirm_enabled,
    'auto_confirm_max_amount', s.auto_confirm_max_amount,
    'amount_tolerance_baht', s.amount_tolerance_baht,
    'require_reference_match', s.require_reference_match,
    'manual_review_min_amount', s.manual_review_min_amount,
    'updated_at', s.updated_at
  )
  FROM public.company_payment_settings s
  WHERE s.id = TRUE;
$$;

CREATE OR REPLACE FUNCTION public.update_company_payment_settings(
  p_bank_name TEXT,
  p_account_number TEXT,
  p_account_name TEXT,
  p_promptpay_id TEXT,
  p_sla_hours INT DEFAULT NULL,
  p_verification_seconds INT DEFAULT NULL,
  p_auto_confirm_enabled BOOLEAN DEFAULT NULL,
  p_auto_confirm_max_amount NUMERIC DEFAULT NULL,
  p_amount_tolerance_baht NUMERIC DEFAULT NULL,
  p_require_reference_match BOOLEAN DEFAULT NULL,
  p_manual_review_min_amount NUMERIC DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL OR NOT (public.is_privileged() OR public.has_role('admin')) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.company_payment_settings
  SET
    bank_name = COALESCE(NULLIF(TRIM(p_bank_name), ''), bank_name),
    account_number = COALESCE(NULLIF(TRIM(p_account_number), ''), account_number),
    account_name = COALESCE(NULLIF(TRIM(p_account_name), ''), account_name),
    promptpay_id = COALESCE(NULLIF(TRIM(p_promptpay_id), ''), promptpay_id),
    payment_instructions_sla_hours = COALESCE(
      p_sla_hours,
      payment_instructions_sla_hours
    ),
    payment_verification_seconds = COALESCE(
      p_verification_seconds,
      payment_verification_seconds
    ),
    auto_confirm_enabled = COALESCE(p_auto_confirm_enabled, auto_confirm_enabled),
    auto_confirm_max_amount = COALESCE(p_auto_confirm_max_amount, auto_confirm_max_amount),
    amount_tolerance_baht = COALESCE(p_amount_tolerance_baht, amount_tolerance_baht),
    require_reference_match = COALESCE(p_require_reference_match, require_reference_match),
    manual_review_min_amount = COALESCE(p_manual_review_min_amount, manual_review_min_amount),
    updated_at = NOW(),
    updated_by = v_uid
  WHERE id = TRUE;

  RETURN public.get_company_payment_settings();
END;
$$;

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
      OR v_expected <= COALESCE(v_s.auto_confirm_max_amount, 50000)
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

GRANT EXECUTE ON FUNCTION public.apply_payment_slip_verification(UUID, JSONB) TO service_role;

CREATE OR REPLACE FUNCTION public.advance_stale_payment_verifications(p_quotation_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seconds INT := public.get_payment_verification_seconds();
  v_payment_id UUID;
BEGIN
  FOR v_payment_id IN
    SELECT p.id
    FROM public.payments p
    WHERE p.quotation_id = p_quotation_id
      AND p.status = 'pending'::public.payment_status
      AND p.verification_status = 'verifying'::public.payment_verification_status
      AND p.verification_started_at IS NOT NULL
      AND p.verification_started_at < NOW() - (v_seconds || ' seconds')::interval
      AND p.verification_result IS NULL
  LOOP
    UPDATE public.payments
    SET
      verification_status = 'review_required'::public.payment_verification_status,
      verification_decision = 'timeout',
      verification_result = jsonb_build_object(
        'error', 'verification_timeout',
        'confidence', 0
      ),
      updated_at = NOW()
    WHERE id = v_payment_id;

    PERFORM public.notify_payment_slip_pending_review(v_payment_id);
  END LOOP;
END;
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
      p.verification_status::text AS verification_status,
      p.slip_detected_amount,
      p.verification_confidence,
      p.verification_decision,
      p.verification_result,
      c.brand_name AS customer_brand_name,
      q.quotation_number,
      q.total AS quotation_total
    FROM public.payments p
    LEFT JOIN public.customers c ON c.id = p.customer_id
    LEFT JOIN public.quotations q ON q.id = p.quotation_id
    WHERE p.status = 'pending'::public.payment_status
      AND p.slip_path IS NOT NULL
      AND p.verification_status = 'review_required'::public.payment_verification_status
    LIMIT 30
  ) t;

  RETURN v_rows;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_payments_verifying_slip()
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
    jsonb_agg(row_to_json(t)::jsonb ORDER BY t.verification_started_at DESC NULLS LAST),
    '[]'::jsonb
  )
  INTO v_rows
  FROM (
    SELECT
      p.id,
      p.customer_id,
      p.quotation_id,
      p.total_amount,
      p.verification_started_at,
      p.verification_result,
      c.brand_name AS customer_brand_name,
      q.quotation_number
    FROM public.payments p
    LEFT JOIN public.customers c ON c.id = p.customer_id
    LEFT JOIN public.quotations q ON q.id = p.quotation_id
    WHERE p.status = 'pending'::public.payment_status
      AND p.verification_status = 'verifying'::public.payment_verification_status
    LIMIT 20
  ) t;

  RETURN v_rows;
END;
$$;
