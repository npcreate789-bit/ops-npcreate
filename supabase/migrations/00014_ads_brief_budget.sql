-- งบแอด/วันมาจากบรีฟ (onboarding) — คัดลอกตอนสร้างแคมเปญครั้งแรก
-- รวม product_lines (จาก 00013) สำหรับกรณีที่ยังไม่ได้รัน migration ก่อนหน้า

ALTER TABLE public.daily_metrics
  ADD COLUMN IF NOT EXISTS product_lines JSONB NOT NULL DEFAULT '[]'::JSONB;

CREATE OR REPLACE FUNCTION public.ensure_default_campaign(
  p_customer_id UUID,
  p_ads_owner_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_budget NUMERIC(12, 2);
BEGIN
  SELECT id INTO v_id FROM public.campaigns WHERE customer_id = p_customer_id LIMIT 1;
  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;

  SELECT daily_ad_budget INTO v_budget
  FROM public.onboarding_forms
  WHERE customer_id = p_customer_id;

  INSERT INTO public.campaigns (customer_id, ads_owner_id, name, daily_budget)
  VALUES (p_customer_id, p_ads_owner_id, 'แคมเปญหลัก', v_budget)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

COMMENT ON COLUMN public.daily_metrics.product_lines IS
  'Array of { sku, spend?, orders?, gmv? } — spend รวมเป็น daily_metrics.spend';
