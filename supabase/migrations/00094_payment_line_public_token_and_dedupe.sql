-- Public payload: expose verification_decision so client skips duplicate review_pending LINE

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
  v_verification_decision TEXT := NULL;
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
      p.id,
      p.verification_decision
    INTO
      v_verification,
      v_can_slip,
      v_slip_submitted,
      v_pending_payment_id,
      v_verification_decision
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
    'pending_payment_id', v_pending_payment_id,
    'payment_verification_decision', v_verification_decision
  );
END;
$$;
