-- Phase 6d: จับคู่รายการเข้าบัญชี (CSV / webhook) กับ payment รอชำระ

CREATE TABLE IF NOT EXISTS public.bank_statement_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  imported_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  source TEXT NOT NULL DEFAULT 'csv'
    CHECK (source IN ('csv', 'webhook', 'manual')),
  filename TEXT,
  line_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.bank_statement_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id UUID REFERENCES public.bank_statement_imports (id) ON DELETE SET NULL,
  transaction_date DATE NOT NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  description TEXT,
  reference_text TEXT,
  external_id TEXT,
  payment_id UUID REFERENCES public.payments (id) ON DELETE SET NULL,
  matched_at TIMESTAMPTZ,
  match_confidence NUMERIC(5, 4),
  match_notes TEXT,
  status TEXT NOT NULL DEFAULT 'unmatched'
    CHECK (status IN ('unmatched', 'matched', 'ignored')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS bank_statement_lines_external_id_idx
  ON public.bank_statement_lines (external_id)
  WHERE external_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS bank_statement_lines_unmatched_idx
  ON public.bank_statement_lines (transaction_date DESC)
  WHERE status = 'unmatched';

CREATE INDEX IF NOT EXISTS bank_statement_lines_payment_id_idx
  ON public.bank_statement_lines (payment_id)
  WHERE payment_id IS NOT NULL;

ALTER TABLE public.company_payment_settings
  ADD COLUMN IF NOT EXISTS bank_match_auto_confirm_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS bank_match_amount_tolerance_baht NUMERIC(12, 2) NOT NULL DEFAULT 1
    CHECK (bank_match_amount_tolerance_baht >= 0 AND bank_match_amount_tolerance_baht <= 100),
  ADD COLUMN IF NOT EXISTS bank_match_lookback_days INT NOT NULL DEFAULT 14
    CHECK (bank_match_lookback_days >= 1 AND bank_match_lookback_days <= 90);

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS bank_matched_line_id UUID
    REFERENCES public.bank_statement_lines (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS bank_matched_at TIMESTAMPTZ;

ALTER TABLE public.bank_statement_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_statement_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bank_statement_imports_select ON public.bank_statement_imports;
CREATE POLICY bank_statement_imports_select ON public.bank_statement_imports
  FOR SELECT TO authenticated
  USING (public.is_privileged() OR public.has_role('admin') OR public.has_role('account'));

DROP POLICY IF EXISTS bank_statement_lines_select ON public.bank_statement_lines;
CREATE POLICY bank_statement_lines_select ON public.bank_statement_lines
  FOR SELECT TO authenticated
  USING (public.is_privileged() OR public.has_role('admin') OR public.has_role('account'));

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
    'line_notify_slip_received', s.line_notify_slip_received,
    'line_notify_payment_confirmed', s.line_notify_payment_confirmed,
    'line_notify_slip_rejected', s.line_notify_slip_rejected,
    'line_notify_review_pending', s.line_notify_review_pending,
    'bank_match_auto_confirm_enabled', s.bank_match_auto_confirm_enabled,
    'bank_match_amount_tolerance_baht', s.bank_match_amount_tolerance_baht,
    'bank_match_lookback_days', s.bank_match_lookback_days,
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
  p_manual_review_min_amount NUMERIC DEFAULT NULL,
  p_line_notify_slip_received BOOLEAN DEFAULT NULL,
  p_line_notify_payment_confirmed BOOLEAN DEFAULT NULL,
  p_line_notify_slip_rejected BOOLEAN DEFAULT NULL,
  p_line_notify_review_pending BOOLEAN DEFAULT NULL,
  p_bank_match_auto_confirm_enabled BOOLEAN DEFAULT NULL,
  p_bank_match_amount_tolerance_baht NUMERIC DEFAULT NULL,
  p_bank_match_lookback_days INT DEFAULT NULL
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
    line_notify_slip_received = COALESCE(p_line_notify_slip_received, line_notify_slip_received),
    line_notify_payment_confirmed = COALESCE(
      p_line_notify_payment_confirmed,
      line_notify_payment_confirmed
    ),
    line_notify_slip_rejected = COALESCE(p_line_notify_slip_rejected, line_notify_slip_rejected),
    line_notify_review_pending = COALESCE(p_line_notify_review_pending, line_notify_review_pending),
    bank_match_auto_confirm_enabled = COALESCE(
      p_bank_match_auto_confirm_enabled,
      bank_match_auto_confirm_enabled
    ),
    bank_match_amount_tolerance_baht = COALESCE(
      p_bank_match_amount_tolerance_baht,
      bank_match_amount_tolerance_baht
    ),
    bank_match_lookback_days = COALESCE(p_bank_match_lookback_days, bank_match_lookback_days),
    updated_at = NOW(),
    updated_by = v_uid
  WHERE id = TRUE;

  RETURN public.get_company_payment_settings();
END;
$$;

CREATE OR REPLACE FUNCTION public.import_bank_statement_lines(
  p_source TEXT,
  p_filename TEXT,
  p_lines JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_import_id UUID;
  v_line JSONB;
  v_inserted INT := 0;
  v_skipped INT := 0;
  v_date DATE;
  v_amount NUMERIC(12, 2);
  v_desc TEXT;
  v_ref TEXT;
  v_ext TEXT;
BEGIN
  IF v_uid IS NULL AND COALESCE(auth.jwt() ->> 'role', '') <> 'service_role' THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF v_uid IS NOT NULL
    AND NOT (public.is_privileged() OR public.has_role('admin') OR public.has_role('account')) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_lines IS NULL OR jsonb_typeof(p_lines) <> 'array' OR jsonb_array_length(p_lines) = 0 THEN
    RAISE EXCEPTION 'ไม่มีรายการนำเข้า';
  END IF;

  INSERT INTO public.bank_statement_imports (imported_by, source, filename, line_count)
  VALUES (
    v_uid,
    COALESCE(NULLIF(TRIM(p_source), ''), 'csv'),
    NULLIF(TRIM(p_filename), ''),
    jsonb_array_length(p_lines)
  )
  RETURNING id INTO v_import_id;

  FOR v_line IN SELECT value FROM jsonb_array_elements(p_lines)
  LOOP
    BEGIN
      v_date := NULLIF(TRIM(v_line ->> 'transaction_date'), '')::DATE;
    EXCEPTION
      WHEN OTHERS THEN
        v_date := NULL;
    END;

    v_amount := NULLIF((v_line ->> 'amount')::NUMERIC, 0);
    v_desc := NULLIF(TRIM(v_line ->> 'description'), '');
    v_ref := NULLIF(TRIM(v_line ->> 'reference_text'), '');
    v_ext := NULLIF(TRIM(v_line ->> 'external_id'), '');

    IF v_date IS NULL OR v_amount IS NULL OR v_amount <= 0 THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    IF v_ext IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.bank_statement_lines b WHERE b.external_id = v_ext
    ) THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    INSERT INTO public.bank_statement_lines (
      import_id,
      transaction_date,
      amount,
      description,
      reference_text,
      external_id
    )
    VALUES (v_import_id, v_date, v_amount, v_desc, v_ref, v_ext);

    v_inserted := v_inserted + 1;
  END LOOP;

  UPDATE public.bank_statement_imports
  SET line_count = v_inserted
  WHERE id = v_import_id;

  RETURN jsonb_build_object(
    'ok', TRUE,
    'import_id', v_import_id,
    'inserted', v_inserted,
    'skipped', v_skipped
  );
END;
$$;

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
    AND q.status::text = 'awaiting_payment'
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

    IF COALESCE(v_s.bank_match_auto_confirm_enabled, FALSE)
      AND (v_match ->> 'confidence')::NUMERIC >= 0.9 THEN
      PERFORM public.confirm_payment_bank_match(
        v_line_id,
        (v_match ->> 'payment_id')::UUID,
        TRUE
      );
      v_auto := v_auto + 1;
    ELSE
      UPDATE public.bank_statement_lines
      SET
        match_notes = 'แนะนำจับคู่ ' || COALESCE(v_match ->> 'quotation_number', '')
          || ' (ความมั่นใจ ' || ROUND((v_match ->> 'confidence')::NUMERIC * 100) || '%)',
        match_confidence = (v_match ->> 'confidence')::NUMERIC
      WHERE id = v_line_id;
    END IF;

    v_matched := v_matched + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', TRUE,
    'suggested', v_matched,
    'auto_confirmed', v_auto
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
    PERFORM public.notify_payment_confirmed_staff(p_payment_id, v_p.quotation_id);
    IF p_auto THEN
      PERFORM public.notify_payment_auto_confirmed_staff(p_payment_id, v_p.quotation_id);
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

GRANT EXECUTE ON FUNCTION public.confirm_payment_bank_match(UUID, UUID, BOOLEAN) TO service_role;

CREATE OR REPLACE FUNCTION public.list_bank_statement_lines_queue()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows JSONB;
BEGIN
  IF auth.uid() IS NULL OR NOT (public.is_privileged() OR public.has_role('admin') OR public.has_role('account')) THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT COALESCE(
    jsonb_agg(row_to_json(t)::jsonb ORDER BY t.transaction_date DESC, t.created_at DESC),
    '[]'::jsonb
  )
  INTO v_rows
  FROM (
    SELECT
      b.id,
      b.import_id,
      b.transaction_date,
      b.amount,
      b.description,
      b.reference_text,
      b.status,
      b.match_confidence,
      b.match_notes,
      b.payment_id,
      b.created_at,
      (
        SELECT public.find_bank_match_for_line(b.id)
      ) AS suggested_match
    FROM public.bank_statement_lines b
    WHERE b.status = 'unmatched'
    LIMIT 50
  ) t;

  RETURN v_rows;
END;
$$;

CREATE OR REPLACE FUNCTION public.ignore_bank_statement_line(p_line_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_privileged() OR public.has_role('admin') OR public.has_role('account')) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.bank_statement_lines
  SET status = 'ignored', match_notes = 'ข้ามโดยทีม'
  WHERE id = p_line_id AND status = 'unmatched';

  RETURN jsonb_build_object('ok', TRUE);
END;
$$;

GRANT EXECUTE ON FUNCTION public.import_bank_statement_lines(TEXT, TEXT, JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.run_bank_payment_matching(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.list_bank_statement_lines_queue() TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_payment_bank_match(UUID, UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ignore_bank_statement_line(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_bank_match_for_line(UUID) TO authenticated, service_role;
