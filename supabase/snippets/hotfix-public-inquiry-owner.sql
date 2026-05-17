-- รันทันทีใน Supabase SQL Editor (ไม่ต้องรอ db push)
-- แก้ FK leads_owner_id_fkey + ฟอร์ม /contact

-- ลบ owner ปลอม
DELETE FROM public.platform_settings
WHERE key = 'default_lead_owner_id'
  AND (
    (value #>> '{}') = '00000000-0000-0000-0000-000000000000'
    OR NOT EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (value #>> '{}')::UUID
        AND p.is_active = TRUE
    )
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
  p_notes TEXT DEFAULT NULL
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
  IF NULLIF(TRIM(p_brand_name), '') IS NULL THEN
    RAISE EXCEPTION 'brand_name is required';
  END IF;

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

  RETURN v_lead_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_public_inquiry FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_public_inquiry TO anon, authenticated;
