-- notify_sales_quotation_accepted used severity 'success' (invalid for user_notifications_severity_check)

CREATE OR REPLACE FUNCTION public.notify_sales_quotation_accepted(p_quotation_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_q public.quotations%ROWTYPE;
  v_brand TEXT;
  v_dedupe TEXT;
BEGIN
  SELECT * INTO v_q FROM public.quotations WHERE id = p_quotation_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT l.brand_name INTO v_brand
  FROM public.leads l
  WHERE l.id = v_q.lead_id;

  v_dedupe := 'quotation-accepted-' || p_quotation_id::text;

  INSERT INTO public.user_notifications (
    user_id,
    dedupe_key,
    title,
    body,
    link,
    severity
  )
  VALUES (
    v_q.owner_id,
    v_dedupe,
    'ลูกค้ายอมรับใบเสนอราคา: ' || COALESCE(v_brand, v_q.quotation_number),
    'เลขที่ ' || v_q.quotation_number || ' — ติดตามชำระเงินและอัปเดตสถานะใน Sales',
    '/app/sales/quotations/' || p_quotation_id::text,
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
END;
$$;
