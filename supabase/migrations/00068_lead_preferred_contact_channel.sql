-- ช่องทางที่ลูกค้าเลือกให้ทีมติดต่อกลับ (LINE / Facebook) — แยกจาก channel ที่มา (website)

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'preferred_contact_channel') THEN
    CREATE TYPE public.preferred_contact_channel AS ENUM ('line', 'facebook');
  END IF;
END
$$;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS preferred_contact_channel public.preferred_contact_channel;

COMMENT ON COLUMN public.leads.preferred_contact_channel IS
  'ช่องทางที่ลูกค้าเลือกให้ NP Create ติดต่อกลับ (จากฟอร์ม /contact)';

-- ลบ signature เก่า — เพิ่ม p_preferred_contact_channel
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
  p_company_website TEXT DEFAULT NULL,
  p_preferred_contact_channel TEXT DEFAULT NULL
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
  v_preferred public.preferred_contact_channel;
BEGIN
  IF NULLIF(TRIM(p_company_website), '') IS NOT NULL THEN
    RETURN gen_random_uuid();
  END IF;

  IF NULLIF(TRIM(p_brand_name), '') IS NULL THEN
    RAISE EXCEPTION 'brand_name is required';
  END IF;

  IF p_preferred_contact_channel IS NULL
    OR p_preferred_contact_channel NOT IN ('line', 'facebook') THEN
    RAISE EXCEPTION 'preferred_contact_channel is required';
  END IF;

  v_preferred := p_preferred_contact_channel::public.preferred_contact_channel;

  IF v_preferred = 'line' AND NULLIF(TRIM(p_line_id), '') IS NULL THEN
    RAISE EXCEPTION 'line_id is required for line channel';
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
    preferred_contact_channel,
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
    v_preferred,
    NULLIF(TRIM(p_shop_links), ''),
    NULLIF(TRIM(p_notes), '')
  )
  RETURNING id INTO v_lead_id;

  PERFORM public.log_public_inquiry_attempt(p_brand_name, p_phone);

  RETURN v_lead_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_public_inquiry(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT, NUMERIC, TEXT, TEXT, TEXT, TEXT
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.submit_public_inquiry(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT, NUMERIC, TEXT, TEXT, TEXT, TEXT
) TO anon, authenticated;

-- แจ้งเตือน inquiry ระบุช่องทางติดต่อกลับ
CREATE OR REPLACE FUNCTION public.notify_users_of_new_lead()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recipient UUID;
  v_contact TEXT;
  v_dedupe TEXT;
  v_title TEXT;
  v_body TEXT;
  v_is_inquiry BOOLEAN;
  v_channel_label TEXT;
BEGIN
  v_is_inquiry := NEW.channel = 'website';
  v_contact := COALESCE(NULLIF(TRIM(NEW.contact_name), ''), 'ยังไม่ระบุผู้ติดต่อ');

  IF NEW.preferred_contact_channel = 'line' THEN
    v_channel_label := 'LINE';
  ELSIF NEW.preferred_contact_channel = 'facebook' THEN
    v_channel_label := 'Facebook';
  ELSE
    v_channel_label := NULL;
  END IF;

  IF v_is_inquiry THEN
    v_dedupe := 'inquiry-new-' || NEW.id::text;
    v_title := 'คำขอติดต่อ: ' || NEW.brand_name;
    v_body := v_contact;
    IF v_channel_label IS NOT NULL THEN
      v_body := v_body || ' · ติดต่อกลับทาง ' || v_channel_label;
    END IF;
  ELSE
    v_dedupe := 'lead-new-' || NEW.id::text;
    v_title := 'Lead ใหม่: ' || NEW.brand_name;
    v_body := v_contact;
  END IF;

  FOR v_recipient IN
    SELECT DISTINCT p.id
    FROM public.profiles p
    WHERE p.is_active = TRUE
      AND (
        p.id = NEW.owner_id
        OR EXISTS (
          SELECT 1
          FROM public.user_roles ur
          WHERE ur.user_id = p.id
            AND ur.role IN (
              'sales'::public.app_role,
              'operations'::public.app_role,
              'ceo'::public.app_role,
              'dev'::public.app_role
            )
        )
      )
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
      v_dedupe,
      v_title,
      v_body,
      '/app/crm/' || NEW.id::text,
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
  END LOOP;

  RETURN NEW;
END;
$$;
