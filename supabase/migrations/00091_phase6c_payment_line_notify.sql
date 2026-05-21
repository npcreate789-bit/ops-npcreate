-- Phase 6c: ตั้งค่าแจ้งลูกค้าทาง LINE ใน flow ชำระเงิน

ALTER TABLE public.company_payment_settings
  ADD COLUMN IF NOT EXISTS line_notify_slip_received BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS line_notify_payment_confirmed BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS line_notify_slip_rejected BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS line_notify_review_pending BOOLEAN NOT NULL DEFAULT TRUE;

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
  p_line_notify_review_pending BOOLEAN DEFAULT NULL
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
    updated_at = NOW(),
    updated_by = v_uid
  WHERE id = TRUE;

  RETURN public.get_company_payment_settings();
END;
$$;
