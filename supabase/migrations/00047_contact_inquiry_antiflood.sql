-- ป้องกันฟลัดส่งจากฟอร์ม contact สาธารณะ (rate limit + honeypot + ความยาวฟิลด์)

CREATE TABLE IF NOT EXISTS public.public_inquiry_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  brand_key TEXT NOT NULL,
  phone_key TEXT,
  ip_key TEXT
);

CREATE INDEX IF NOT EXISTS public_inquiry_attempts_brand_at_idx
  ON public.public_inquiry_attempts (brand_key, submitted_at DESC);

CREATE INDEX IF NOT EXISTS public_inquiry_attempts_phone_at_idx
  ON public.public_inquiry_attempts (phone_key, submitted_at DESC)
  WHERE phone_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS public_inquiry_attempts_ip_at_idx
  ON public.public_inquiry_attempts (ip_key, submitted_at DESC)
  WHERE ip_key IS NOT NULL;

ALTER TABLE public.public_inquiry_attempts ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.normalize_contact_key(p_text TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(regexp_replace(trim(coalesce(p_text, '')), '\s+', ' ', 'g'));
$$;

CREATE OR REPLACE FUNCTION public.normalize_contact_phone_key(p_phone TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), '');
$$;

CREATE OR REPLACE FUNCTION public.get_inquiry_client_ip()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_headers JSONB;
  v_ip TEXT;
BEGIN
  BEGIN
    v_headers := NULLIF(current_setting('request.headers', true), '')::jsonb;
  EXCEPTION
    WHEN OTHERS THEN
      RETURN NULL;
  END;

  IF v_headers IS NULL THEN
    RETURN NULL;
  END IF;

  v_ip := COALESCE(
    NULLIF(trim(v_headers->>'cf-connecting-ip'), ''),
    NULLIF(trim(split_part(coalesce(v_headers->>'x-forwarded-for', ''), ',', 1)), ''),
    NULLIF(trim(v_headers->>'x-real-ip'), '')
  );

  IF v_ip IS NULL OR v_ip = '' THEN
    RETURN NULL;
  END IF;

  RETURN left(v_ip, 45);
END;
$$;

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

  IF v_brand_count >= 2 THEN
    RAISE EXCEPTION 'rate_limit_brand';
  END IF;

  IF v_phone IS NOT NULL THEN
    SELECT count(*)::int
    INTO v_phone_count
    FROM public.public_inquiry_attempts a
    WHERE a.phone_key = v_phone
      AND a.submitted_at > NOW() - INTERVAL '1 hour';

    IF v_phone_count >= 2 THEN
      RAISE EXCEPTION 'rate_limit_phone';
    END IF;
  END IF;

  IF v_ip IS NOT NULL THEN
    SELECT count(*)::int
    INTO v_ip_count
    FROM public.public_inquiry_attempts a
    WHERE a.ip_key = v_ip
      AND a.submitted_at > NOW() - INTERVAL '10 minutes';

    IF v_ip_count >= 5 THEN
      RAISE EXCEPTION 'rate_limit_ip';
    END IF;
  END IF;

  SELECT count(*)::int
  INTO v_global_count
  FROM public.public_inquiry_attempts a
  WHERE a.submitted_at > NOW() - INTERVAL '1 minute';

  IF v_global_count >= 15 THEN
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
      AND l.created_at > NOW() - INTERVAL '5 minutes'
  ) THEN
    RAISE EXCEPTION 'rate_limit_duplicate';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_public_inquiry_attempt(
  p_brand_name TEXT,
  p_phone TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.public_inquiry_attempts (brand_key, phone_key, ip_key)
  VALUES (
    public.normalize_contact_key(p_brand_name),
    public.normalize_contact_phone_key(p_phone),
    public.get_inquiry_client_ip()
  );

  DELETE FROM public.public_inquiry_attempts
  WHERE submitted_at < NOW() - INTERVAL '7 days';
END;
$$;

-- ลบ signature เก่า (ไม่มี p_company_website) — กัน overload ซ้ำ
DROP FUNCTION IF EXISTS public.submit_public_inquiry(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT, NUMERIC, TEXT, TEXT
);

CREATE OR REPLACE FUNCTION public.submit_public_inquiry(
  p_brand_name TEXT,
  p_contact_name TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_line_id TEXT DEFAULT NULL,
  p_facebook TEXT DEFAULT NULL,
  p_business_type TEXT DEFAULT NULL,
  p_services_interested TEXT[] DEFAULT '{}',
  p_pain_points TEXT DEFAULT NULL,
  p_ad_budget_monthly NUMERIC DEFAULT NULL,
  p_shop_links TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_company_website TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner UUID;
  v_lead_id UUID;
  v_setting UUID;
BEGIN
  IF NULLIF(TRIM(p_company_website), '') IS NOT NULL THEN
    RETURN gen_random_uuid();
  END IF;

  IF NULLIF(TRIM(p_brand_name), '') IS NULL THEN
    RAISE EXCEPTION 'brand_name is required';
  END IF;

  IF length(trim(p_brand_name)) > 200 THEN
    RAISE EXCEPTION 'brand_name too long';
  END IF;

  IF p_contact_name IS NOT NULL AND length(trim(p_contact_name)) > 120 THEN
    RAISE EXCEPTION 'contact_name too long';
  END IF;

  IF p_phone IS NOT NULL AND length(trim(p_phone)) > 30 THEN
    RAISE EXCEPTION 'phone too long';
  END IF;

  IF p_line_id IS NOT NULL AND length(trim(p_line_id)) > 80 THEN
    RAISE EXCEPTION 'line_id too long';
  END IF;

  IF p_facebook IS NOT NULL AND length(trim(p_facebook)) > 300 THEN
    RAISE EXCEPTION 'facebook too long';
  END IF;

  IF p_pain_points IS NOT NULL AND length(trim(p_pain_points)) > 4000 THEN
    RAISE EXCEPTION 'pain_points too long';
  END IF;

  IF p_shop_links IS NOT NULL AND length(trim(p_shop_links)) > 2000 THEN
    RAISE EXCEPTION 'shop_links too long';
  END IF;

  IF p_notes IS NOT NULL AND length(trim(p_notes)) > 4000 THEN
    RAISE EXCEPTION 'notes too long';
  END IF;

  IF p_services_interested IS NOT NULL AND cardinality(p_services_interested) > 20 THEN
    RAISE EXCEPTION 'too many services';
  END IF;

  PERFORM public.assert_public_inquiry_rate_limit(p_brand_name, p_phone);

  SELECT (value #>> '{}')::UUID
  INTO v_setting
  FROM public.platform_settings
  WHERE key = 'default_lead_owner_id';

  IF v_setting IS NOT NULL THEN
    SELECT p.id
    INTO v_owner
    FROM public.profiles p
    WHERE p.id = v_setting
      AND p.is_active = TRUE;
  END IF;

  IF v_owner IS NULL THEN
    SELECT p.id
    INTO v_owner
    FROM public.user_roles ur
    INNER JOIN public.profiles p ON p.id = ur.user_id AND p.is_active = TRUE
    WHERE ur.role = 'sales'
    ORDER BY ur.created_at
    LIMIT 1;
  END IF;

  IF v_owner IS NULL THEN
    SELECT p.id
    INTO v_owner
    FROM public.profiles p
    WHERE p.is_active = TRUE
    ORDER BY p.created_at
    LIMIT 1;
  END IF;

  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'no lead owner configured';
  END IF;

  INSERT INTO public.leads (
    owner_id,
    brand_name,
    contact_name,
    phone,
    line_id,
    facebook,
    business_type,
    ad_budget_monthly,
    pain_points,
    services_interested,
    status,
    channel,
    shop_links,
    notes
  )
  VALUES (
    v_owner,
    TRIM(p_brand_name),
    NULLIF(TRIM(p_contact_name), ''),
    NULLIF(TRIM(p_phone), ''),
    NULLIF(TRIM(p_line_id), ''),
    NULLIF(TRIM(p_facebook), ''),
    NULLIF(TRIM(p_business_type), ''),
    p_ad_budget_monthly,
    NULLIF(TRIM(p_pain_points), ''),
    COALESCE(p_services_interested, '{}'),
    'interested',
    'website',
    NULLIF(TRIM(p_shop_links), ''),
    NULLIF(TRIM(p_notes), '')
  )
  RETURNING id INTO v_lead_id;

  PERFORM public.log_public_inquiry_attempt(p_brand_name, p_phone);

  RETURN v_lead_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_public_inquiry(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT, NUMERIC, TEXT, TEXT, TEXT
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.submit_public_inquiry(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT, NUMERIC, TEXT, TEXT, TEXT
) TO anon, authenticated;

REVOKE ALL ON TABLE public.public_inquiry_attempts FROM PUBLIC;
REVOKE ALL ON FUNCTION public.normalize_contact_key FROM PUBLIC;
REVOKE ALL ON FUNCTION public.normalize_contact_phone_key FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_inquiry_client_ip FROM PUBLIC;
REVOKE ALL ON FUNCTION public.assert_public_inquiry_rate_limit FROM PUBLIC;
REVOKE ALL ON FUNCTION public.log_public_inquiry_attempt FROM PUBLIC;
