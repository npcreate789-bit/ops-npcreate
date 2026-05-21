-- Phase 6 P1 hardening: stale advance lock, atomic import, settings access for ops/account

-- 1) advance_stale: ใช้ SKIP LOCKED ป้องกัน notify ซ้ำเมื่อหลาย tab/poll พร้อมกัน
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
    FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE public.payments
    SET
      verification_status = 'review_required'::public.payment_verification_status,
      verification_decision = COALESCE(verification_decision, 'timeout'),
      updated_at = NOW()
    WHERE id = v_payment_id
      AND verification_status = 'verifying'::public.payment_verification_status;

    IF FOUND THEN
      PERFORM public.notify_payment_slip_pending_review(v_payment_id);
    END IF;
  END LOOP;
END;
$$;

-- 2) import_bank_statement_lines: atomic ON CONFLICT แทน SELECT-then-INSERT
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
  v_inserted_id UUID;
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

    IF v_ext IS NOT NULL THEN
      INSERT INTO public.bank_statement_lines (
        import_id, transaction_date, amount, description, reference_text, external_id
      )
      VALUES (v_import_id, v_date, v_amount, v_desc, v_ref, v_ext)
      ON CONFLICT (external_id) WHERE external_id IS NOT NULL DO NOTHING
      RETURNING id INTO v_inserted_id;

      IF v_inserted_id IS NULL THEN
        v_skipped := v_skipped + 1;
      ELSE
        v_inserted := v_inserted + 1;
      END IF;
      v_inserted_id := NULL;
    ELSE
      INSERT INTO public.bank_statement_lines (
        import_id, transaction_date, amount, description, reference_text, external_id
      )
      VALUES (v_import_id, v_date, v_amount, v_desc, v_ref, NULL);
      v_inserted := v_inserted + 1;
    END IF;
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

-- 3) Settings: ให้ operations/account ดูได้ (read-only) — write ยังจำกัด admin/privileged
DROP POLICY IF EXISTS bank_statement_imports_select ON public.bank_statement_imports;
CREATE POLICY bank_statement_imports_select ON public.bank_statement_imports
  FOR SELECT TO authenticated
  USING (
    public.is_privileged()
    OR public.has_role('admin')
    OR public.has_role('account')
    OR public.has_role('operations')
  );

DROP POLICY IF EXISTS bank_statement_lines_select ON public.bank_statement_lines;
CREATE POLICY bank_statement_lines_select ON public.bank_statement_lines
  FOR SELECT TO authenticated
  USING (
    public.is_privileged()
    OR public.has_role('admin')
    OR public.has_role('account')
    OR public.has_role('operations')
  );

-- get_company_payment_settings เปิดให้ทุก role ที่อยู่ใน Finance อ่านได้ (SECURITY DEFINER เปิดอยู่แล้ว)
-- เพิ่ม helper สำหรับ frontend เช็คว่า user เห็น settings ได้แค่ readonly หรือ manage ได้
CREATE OR REPLACE FUNCTION public.can_manage_company_payment_settings()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(public.is_privileged() OR public.has_role('admin'), FALSE);
$$;

GRANT EXECUTE ON FUNCTION public.can_manage_company_payment_settings() TO authenticated;
