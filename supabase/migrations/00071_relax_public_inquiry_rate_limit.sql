-- ผ่อน rate limit ฟอร์ม /contact (ยังกัน spam แต่ลด false positive ตอนทดสอบ/ส่งซ้ำ)

CREATE OR REPLACE FUNCTION public.assert_public_inquiry_rate_limit(
  p_brand_name TEXT,
  p_phone TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_brand TEXT := public.normalize_contact_key(p_brand_name);
  v_phone TEXT := public.normalize_contact_phone_key(p_phone);
  v_ip TEXT := public.get_inquiry_client_ip();
  v_brand_count INT;
  v_phone_count INT;
  v_ip_count INT;
  v_global_count INT;
BEGIN
  IF v_brand = '' THEN
    RAISE EXCEPTION 'brand_name is required';
  END IF;

  IF v_phone IS NOT NULL AND length(v_phone) < 9 THEN
    v_phone := NULL;
  END IF;

  SELECT count(*)::int
  INTO v_brand_count
  FROM public.public_inquiry_attempts a
  WHERE a.brand_key = v_brand
    AND a.submitted_at > NOW() - INTERVAL '15 minutes';

  IF v_brand_count >= 8 THEN
    RAISE EXCEPTION 'rate_limit_brand';
  END IF;

  IF v_phone IS NOT NULL THEN
    SELECT count(*)::int
    INTO v_phone_count
    FROM public.public_inquiry_attempts a
    WHERE a.phone_key = v_phone
      AND a.submitted_at > NOW() - INTERVAL '1 hour';

    IF v_phone_count >= 6 THEN
      RAISE EXCEPTION 'rate_limit_phone';
    END IF;
  END IF;

  IF v_ip IS NOT NULL THEN
    SELECT count(*)::int
    INTO v_ip_count
    FROM public.public_inquiry_attempts a
    WHERE a.ip_key = v_ip
      AND a.submitted_at > NOW() - INTERVAL '10 minutes';

    IF v_ip_count >= 15 THEN
      RAISE EXCEPTION 'rate_limit_ip';
    END IF;
  END IF;

  SELECT count(*)::int
  INTO v_global_count
  FROM public.public_inquiry_attempts a
  WHERE a.submitted_at > NOW() - INTERVAL '1 minute';

  IF v_global_count >= 30 THEN
    RAISE EXCEPTION 'rate_limit_global';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.leads l
    WHERE l.channel = 'website'
      AND public.normalize_contact_key(l.brand_name) = v_brand
      AND (
        v_phone IS NULL
        OR public.normalize_contact_phone_key(l.phone) = v_phone
      )
      AND l.created_at > NOW() - INTERVAL '1 minute'
  ) THEN
    RAISE EXCEPTION 'rate_limit_duplicate';
  END IF;
END;
$$;
