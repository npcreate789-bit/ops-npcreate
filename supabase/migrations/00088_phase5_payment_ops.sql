-- Phase 5: ตั้งค่าบัญชี, ปฏิเสธสลิป, ยกเลิกหลัง accept, SLA ส่งบัญชี

ALTER TABLE public.quotations
  ADD COLUMN IF NOT EXISTS payment_instructions_sla_notified_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.company_payment_settings (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE,
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_name TEXT NOT NULL,
  promptpay_id TEXT NOT NULL,
  payment_instructions_sla_hours INT NOT NULL DEFAULT 48
    CHECK (payment_instructions_sla_hours >= 1 AND payment_instructions_sla_hours <= 720),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  CONSTRAINT company_payment_settings_singleton CHECK (id = TRUE)
);

INSERT INTO public.company_payment_settings (
  id,
  bank_name,
  account_number,
  account_name,
  promptpay_id
)
VALUES (
  TRUE,
  'กสิกรไทย',
  '158-3-652430',
  'บจก.เอ็นพี ครีเอ็ท',
  '0405566003636'
)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.company_payment_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS company_payment_settings_select ON public.company_payment_settings;
CREATE POLICY company_payment_settings_select ON public.company_payment_settings
  FOR SELECT TO anon, authenticated
  USING (TRUE);

DROP POLICY IF EXISTS company_payment_settings_update ON public.company_payment_settings;
CREATE POLICY company_payment_settings_update ON public.company_payment_settings
  FOR UPDATE TO authenticated
  USING (public.is_privileged() OR public.has_role('admin'))
  WITH CHECK (public.is_privileged() OR public.has_role('admin'));

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
  p_sla_hours INT DEFAULT NULL
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
    updated_at = NOW(),
    updated_by = v_uid
  WHERE id = TRUE;

  RETURN public.get_company_payment_settings();
END;
$$;

CREATE OR REPLACE FUNCTION public.list_quotations_pending_payment_instructions()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_rows JSONB;
  v_sla_hours INT := 48;
BEGIN
  IF v_uid IS NULL OR NOT public.can_view_quotation_payment_queue() THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT s.payment_instructions_sla_hours
  INTO v_sla_hours
  FROM public.company_payment_settings s
  WHERE s.id = TRUE;

  v_sla_hours := COALESCE(v_sla_hours, 48);

  SELECT COALESCE(
    jsonb_agg(row_to_json(t)::jsonb ORDER BY t.is_sla_overdue DESC, t.accepted_at DESC NULLS LAST),
    '[]'::jsonb
  )
  INTO v_rows
  FROM (
    SELECT
      q.id,
      q.quotation_number,
      q.lead_id,
      q.owner_id,
      q.status,
      q.total,
      q.accepted_at,
      q.contract_months,
      l.brand_name AS lead_brand_name,
      (
        q.accepted_at IS NOT NULL
        AND q.accepted_at < NOW() - (v_sla_hours || ' hours')::interval
      ) AS is_sla_overdue,
      v_sla_hours AS sla_hours
    FROM public.quotations q
    LEFT JOIN public.leads l ON l.id = q.lead_id
    WHERE q.status = 'accepted'::public.quotation_status
      AND q.payment_instructions_sent_at IS NULL
      AND (
        public.is_privileged()
        OR public.has_role('admin')
        OR public.has_role('account')
        OR q.owner_id = v_uid
      )
    LIMIT 30
  ) t;

  RETURN v_rows;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_payment_instructions_sla_overdue()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sla_hours INT := 48;
  v_q RECORD;
  v_brand TEXT;
  v_title TEXT;
  v_body TEXT;
  v_link TEXT;
  v_recipient UUID;
  v_count INT := 0;
BEGIN
  IF auth.uid() IS NULL OR NOT public.can_view_quotation_payment_queue() THEN
    RETURN 0;
  END IF;

  SELECT s.payment_instructions_sla_hours INTO v_sla_hours
  FROM public.company_payment_settings s
  WHERE s.id = TRUE;
  v_sla_hours := COALESCE(v_sla_hours, 48);

  FOR v_q IN
    SELECT q.*
    FROM public.quotations q
    WHERE q.status = 'accepted'::public.quotation_status
      AND q.payment_instructions_sent_at IS NULL
      AND q.payment_instructions_sla_notified_at IS NULL
      AND q.accepted_at IS NOT NULL
      AND q.accepted_at < NOW() - (v_sla_hours || ' hours')::interval
    LIMIT 20
  LOOP
    SELECT l.brand_name INTO v_brand FROM public.leads l WHERE l.id = v_q.lead_id;
    v_title := 'เกิน SLA ส่งบัญชี: ' || COALESCE(v_brand, v_q.quotation_number);
    v_body :=
      'เลขที่ ' || v_q.quotation_number
      || ' · ยอมรับเมื่อ ' || to_char(v_q.accepted_at AT TIME ZONE 'Asia/Bangkok', 'DD/MM/YYYY HH24:MI')
      || ' — ส่งข้อมูลชำระเงินด่วน';
    v_link := '/app/sales/quotations/' || v_q.id::text || '?action=payment';

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
        'payment-instructions-sla-' || v_q.id::text || '-' || v_recipient::text,
        v_title,
        v_body,
        v_link,
        'warn'
      )
      ON CONFLICT (user_id, dedupe_key) DO NOTHING;
    END LOOP;

    UPDATE public.quotations
    SET payment_instructions_sla_notified_at = NOW(), updated_at = NOW()
    WHERE id = v_q.id;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
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

CREATE OR REPLACE FUNCTION public.cancel_quotation_after_accept(
  p_quotation_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_q public.quotations%ROWTYPE;
  v_uid UUID := auth.uid();
  v_reason TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_q
  FROM public.quotations
  WHERE id = p_quotation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quotation not found';
  END IF;

  IF v_q.status::text NOT IN ('accepted', 'awaiting_payment') THEN
    RAISE EXCEPTION 'ยกเลิกได้เฉพาะใบที่ยอมรับแล้วหรือรอชำระเงิน';
  END IF;

  IF NOT (
    public.is_privileged()
    OR public.has_role('admin')
    OR v_q.owner_id = v_uid
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  v_reason := COALESCE(NULLIF(TRIM(p_reason), ''), 'ยกเลิกโดยทีมงาน');

  UPDATE public.payments
  SET
    status = 'cancelled'::public.payment_status,
    notes = TRIM(
      COALESCE(notes || E'\n', '')
      || '[ยกเลิกตามใบเสนอราคา '
      || to_char(NOW() AT TIME ZONE 'Asia/Bangkok', 'DD/MM/YYYY HH24:MI')
      || '] '
      || v_reason
    ),
    updated_at = NOW()
  WHERE quotation_id = p_quotation_id
    AND status = 'pending'::public.payment_status;

  UPDATE public.quotations
  SET
    status = 'cancelled'::public.quotation_status,
    notes = TRIM(COALESCE(notes || E'\n', '') || '[ยกเลิก] ' || v_reason),
    updated_at = NOW()
  WHERE id = p_quotation_id;

  IF v_q.lead_id IS NOT NULL THEN
    UPDATE public.leads
    SET
      status = 'quotation_sent'::public.lead_status,
      updated_at = NOW()
    WHERE id = v_q.lead_id
      AND status IN (
        'awaiting_payment'::public.lead_status,
        'quotation_sent'::public.lead_status,
        'follow_up'::public.lead_status
      );
  END IF;

  RETURN jsonb_build_object(
    'ok', TRUE,
    'quotation_id', p_quotation_id,
    'status', 'cancelled'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_company_payment_settings() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_company_payment_settings(TEXT, TEXT, TEXT, TEXT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_payment_customer_slip(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_quotation_after_accept(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.notify_payment_instructions_sla_overdue() TO authenticated;
