-- ใบเสนอราคายอมรับแล้ว → คิวส่งข้อมูลชำระเงิน + แจ้งเตือนหลายบทบาท

ALTER TABLE public.quotations
  ADD COLUMN IF NOT EXISTS payment_instructions_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_instructions_sent_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS quotations_pending_payment_idx
  ON public.quotations (accepted_at DESC NULLS LAST)
  WHERE status = 'accepted'::public.quotation_status
    AND payment_instructions_sent_at IS NULL;

CREATE OR REPLACE FUNCTION public.notify_quotation_accepted_staff(p_quotation_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_q public.quotations%ROWTYPE;
  v_brand TEXT;
  v_title TEXT;
  v_body TEXT;
  v_link TEXT;
  v_recipient UUID;
BEGIN
  SELECT * INTO v_q FROM public.quotations WHERE id = p_quotation_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT l.brand_name INTO v_brand
  FROM public.leads l
  WHERE l.id = v_q.lead_id;

  v_title := 'ลูกค้ายอมรับใบเสนอราคา: ' || COALESCE(v_brand, v_q.quotation_number);
  v_body :=
    'เลขที่ ' || v_q.quotation_number
    || ' · ยอด ' || to_char(v_q.total, 'FM999,999,990.00') || ' บาท'
    || ' — ส่งข้อมูลชำระเงินให้ลูกค้า';
  v_link := '/app/sales/quotations/' || p_quotation_id::text || '?action=payment';

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
      'quotation-accepted-' || p_quotation_id::text || '-' || v_recipient::text,
      v_title,
      v_body,
      v_link,
      'warn'
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

CREATE OR REPLACE FUNCTION public.notify_sales_quotation_accepted(p_quotation_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.notify_quotation_accepted_staff(p_quotation_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.can_view_quotation_payment_queue()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_privileged()
    OR public.has_role('admin')
    OR public.has_role('sales')
    OR public.has_role('account');
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
BEGIN
  IF v_uid IS NULL OR NOT public.can_view_quotation_payment_queue() THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT COALESCE(
    jsonb_agg(row_to_json(t)::jsonb ORDER BY t.accepted_at DESC NULLS LAST),
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
      l.brand_name AS lead_brand_name
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

CREATE OR REPLACE FUNCTION public.mark_quotation_payment_instructions_sent(p_quotation_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.quotations%ROWTYPE;
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_row
  FROM public.quotations
  WHERE id = p_quotation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quotation not found';
  END IF;

  IF v_row.status::text <> 'accepted' THEN
    RAISE EXCEPTION 'ใบเสนอราคาต้องอยู่สถานะยอมรับแล้วจึงจะบันทึกการส่งข้อมูลชำระเงินได้';
  END IF;

  IF NOT (
    public.is_privileged()
    OR public.has_role('admin')
    OR public.has_role('account')
    OR v_row.owner_id = v_uid
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.quotations
  SET
    status = 'awaiting_payment'::public.quotation_status,
    payment_instructions_sent_at = NOW(),
    payment_instructions_sent_by = v_uid,
    updated_at = NOW()
  WHERE id = p_quotation_id;

  RETURN jsonb_build_object(
    'ok', TRUE,
    'quotation_id', p_quotation_id,
    'status', 'awaiting_payment'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_quotations_pending_payment_instructions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_quotation_payment_instructions_sent(UUID) TO authenticated;
