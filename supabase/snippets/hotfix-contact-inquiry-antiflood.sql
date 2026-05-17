-- แก้ ERROR 42725: function name "public.submit_public_inquiry" is not unique
-- รันใน Supabase SQL Editor (ไฟล์นี้เพียงอย่างเดียว)

DROP FUNCTION IF EXISTS public.submit_public_inquiry(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT, NUMERIC, TEXT, TEXT
);

DROP FUNCTION IF EXISTS public.submit_public_inquiry(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT, NUMERIC, TEXT, TEXT, TEXT
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
