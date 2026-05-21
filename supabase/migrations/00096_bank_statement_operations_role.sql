-- Operations: นำเข้า/จับคู่/ยืนยันรายการธนาคาร (สอดคล้อง FINANCE_CONFIRM_ROLES)

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
    AND NOT (
      public.is_privileged()
      OR public.has_role('admin')
      OR public.has_role('account')
      OR public.has_role('operations')
    ) THEN
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

  IF v_uid IS NOT NULL
    AND NOT (
      public.is_privileged()
      OR public.has_role('admin')
      OR public.has_role('account')
      OR public.has_role('operations')
    ) THEN
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
    AND NOT (
      public.is_privileged()
      OR public.has_role('admin')
      OR public.has_role('account')
      OR public.has_role('operations')
    ) THEN
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

CREATE OR REPLACE FUNCTION public.ignore_bank_statement_line(p_line_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (
    public.is_privileged()
    OR public.has_role('admin')
    OR public.has_role('account')
    OR public.has_role('operations')
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.bank_statement_lines
  SET status = 'ignored', match_notes = 'ข้ามโดยทีม'
  WHERE id = p_line_id AND status = 'unmatched';

  RETURN jsonb_build_object('ok', TRUE);
END;
$$;
