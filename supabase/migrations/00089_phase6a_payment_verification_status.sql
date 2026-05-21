-- Phase 6a: สถานะตรวจสลิป (verifying → review_required) + payload สาธารณะ

CREATE TYPE public.payment_verification_status AS ENUM (
  'none',
  'verifying',
  'review_required',
  'confirmed'
);

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS verification_status public.payment_verification_status
    NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS verification_started_at TIMESTAMPTZ;

ALTER TABLE public.company_payment_settings
  ADD COLUMN IF NOT EXISTS payment_verification_seconds INT NOT NULL DEFAULT 90
    CHECK (payment_verification_seconds >= 15 AND payment_verification_seconds <= 600);

UPDATE public.payments
SET verification_status = 'review_required'::public.payment_verification_status
WHERE status = 'pending'::public.payment_status
  AND slip_path IS NOT NULL
  AND verification_status = 'none'::public.payment_verification_status;

CREATE OR REPLACE FUNCTION public.get_payment_verification_seconds()
RETURNS INT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT s.payment_verification_seconds FROM public.company_payment_settings s WHERE s.id = TRUE),
    90
  );
$$;

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
  LOOP
    UPDATE public.payments
    SET
      verification_status = 'review_required'::public.payment_verification_status,
      updated_at = NOW()
    WHERE id = v_payment_id;

    PERFORM public.notify_payment_slip_pending_review(v_payment_id);
  END LOOP;
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
  p_verification_seconds INT DEFAULT NULL
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
    updated_at = NOW(),
    updated_by = v_uid
  WHERE id = TRUE;

  RETURN public.get_company_payment_settings();
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
  v_verification TEXT := 'none';
  v_payment_status_message TEXT := NULL;
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
      (p.slip_path IS NOT NULL)
    INTO v_verification, v_can_slip, v_slip_submitted
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
    'payment_status_message', v_payment_status_message
  );
END;
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
    verification_status = 'verifying'::public.payment_verification_status,
    verification_started_at = NOW(),
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
  IF NOT (public.is_privileged() OR public.has_role('admin')) THEN
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

  IF v_payment.quotation_id IS NOT NULL THEN
    PERFORM public.notify_payment_confirmed_staff(p_payment_id, v_payment.quotation_id);
  ELSE
    PERFORM public.notify_payment_confirmed_staff(p_payment_id, NULL);
  END IF;
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
      c.brand_name AS customer_brand_name,
      q.quotation_number
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

GRANT EXECUTE ON FUNCTION public.list_payments_verifying_slip() TO authenticated;
GRANT EXECUTE ON FUNCTION public.advance_stale_payment_verifications(UUID) TO anon, authenticated;
