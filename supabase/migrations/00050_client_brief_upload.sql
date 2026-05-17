-- Sprint: บรีฟลูกค้า — client บันทึกได้, อัปโหลดไฟล์, แจ้ง Account

ALTER TABLE public.onboarding_forms
  ADD COLUMN IF NOT EXISTS client_submitted_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.brief_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers (id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  byte_size BIGINT,
  uploaded_by UUID NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS brief_attachments_customer_id_idx
  ON public.brief_attachments (customer_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS brief_attachments_storage_path_idx
  ON public.brief_attachments (storage_path);

ALTER TABLE public.brief_attachments ENABLE ROW LEVEL SECURITY;

-- ลูกค้า insert บรีฟครั้งแรก
DROP POLICY IF EXISTS onboarding_forms_insert_client ON public.onboarding_forms;

CREATE POLICY onboarding_forms_insert_client ON public.onboarding_forms
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role('client')
    AND customer_id = public.my_client_customer_id()
  );

-- ให้ client เรียก checklist หลังบันทึกบรีฟ
CREATE OR REPLACE FUNCTION public.ensure_onboarding_checklist(p_customer_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (
    public.is_privileged()
    OR public.has_role('account')
    OR public.has_role('admin')
    OR public.has_role('operations')
    OR (
      public.has_role('client')
      AND p_customer_id = public.my_client_customer_id()
    )
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  INSERT INTO public.onboarding_checklist (customer_id, item_key, status)
  VALUES
    (p_customer_id, 'shop_link', 'pending'),
    (p_customer_id, 'product_link', 'pending'),
    (p_customer_id, 'pricing', 'pending'),
    (p_customer_id, 'ad_budget', 'pending'),
    (p_customer_id, 'system_access', 'pending'),
    (p_customer_id, 'clips_ready', 'no'),
    (p_customer_id, 'product_page', 'needs_fix'),
    (p_customer_id, 'commission', 'needs_fix')
  ON CONFLICT (customer_id, item_key) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_account_brief_submitted(p_customer_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_brand TEXT;
  v_owner UUID;
  v_recipient UUID;
  v_dedupe TEXT;
BEGIN
  SELECT c.brand_name, c.account_owner_id
  INTO v_brand, v_owner
  FROM public.customers c
  WHERE c.id = p_customer_id;

  IF v_brand IS NULL THEN
    RETURN;
  END IF;

  v_dedupe := 'brief-submitted-' || p_customer_id::text;

  FOR v_recipient IN
    SELECT DISTINCT p.id
    FROM public.profiles p
    WHERE p.is_active = TRUE
      AND (
        p.id = v_owner
        OR EXISTS (
          SELECT 1
          FROM public.user_roles ur
          WHERE ur.user_id = p.id
            AND ur.role IN (
              'account'::public.app_role,
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
      'ลูกค้าส่งบรีฟ: ' || v_brand,
      'ตรวจความครบถ้วนและ checklist ใน Onboarding',
      '/app/onboarding/' || p_customer_id::text,
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
END;
$$;

CREATE OR REPLACE FUNCTION public.save_client_onboarding_form(
  p_tiktok_shop_url TEXT DEFAULT NULL,
  p_product_links TEXT DEFAULT NULL,
  p_pricing_info TEXT DEFAULT NULL,
  p_promotion_info TEXT DEFAULT NULL,
  p_profit_margin TEXT DEFAULT NULL,
  p_commission_info TEXT DEFAULT NULL,
  p_target_roi NUMERIC DEFAULT NULL,
  p_daily_ad_budget NUMERIC DEFAULT NULL,
  p_existing_content TEXT DEFAULT NULL,
  p_ads_account_info TEXT DEFAULT NULL,
  p_seller_account_info TEXT DEFAULT NULL,
  p_business_center_info TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_submit BOOLEAN DEFAULT FALSE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_id UUID;
  v_form_id UUID;
BEGIN
  IF NOT public.has_role('client') THEN
    RAISE EXCEPTION 'client role required';
  END IF;

  v_customer_id := public.my_client_customer_id();
  IF v_customer_id IS NULL THEN
    RAISE EXCEPTION 'no linked customer';
  END IF;

  INSERT INTO public.onboarding_forms (
    customer_id,
    tiktok_shop_url,
    product_links,
    pricing_info,
    promotion_info,
    profit_margin,
    commission_info,
    target_roi,
    daily_ad_budget,
    existing_content,
    ads_account_info,
    seller_account_info,
    business_center_info,
    notes,
    client_submitted_at
  )
  VALUES (
    v_customer_id,
    NULLIF(TRIM(p_tiktok_shop_url), ''),
    NULLIF(TRIM(p_product_links), ''),
    NULLIF(TRIM(p_pricing_info), ''),
    NULLIF(TRIM(p_promotion_info), ''),
    NULLIF(TRIM(p_profit_margin), ''),
    NULLIF(TRIM(p_commission_info), ''),
    p_target_roi,
    p_daily_ad_budget,
    NULLIF(TRIM(p_existing_content), ''),
    NULLIF(TRIM(p_ads_account_info), ''),
    NULLIF(TRIM(p_seller_account_info), ''),
    NULLIF(TRIM(p_business_center_info), ''),
    NULLIF(TRIM(p_notes), ''),
    CASE WHEN p_submit THEN NOW() ELSE NULL END
  )
  ON CONFLICT (customer_id) DO UPDATE
  SET
    tiktok_shop_url = EXCLUDED.tiktok_shop_url,
    product_links = EXCLUDED.product_links,
    pricing_info = EXCLUDED.pricing_info,
    promotion_info = EXCLUDED.promotion_info,
    profit_margin = EXCLUDED.profit_margin,
    commission_info = EXCLUDED.commission_info,
    target_roi = EXCLUDED.target_roi,
    daily_ad_budget = EXCLUDED.daily_ad_budget,
    existing_content = EXCLUDED.existing_content,
    ads_account_info = EXCLUDED.ads_account_info,
    seller_account_info = EXCLUDED.seller_account_info,
    business_center_info = EXCLUDED.business_center_info,
    notes = EXCLUDED.notes,
    client_submitted_at = CASE
      WHEN p_submit THEN COALESCE(public.onboarding_forms.client_submitted_at, NOW())
      ELSE public.onboarding_forms.client_submitted_at
    END,
    updated_at = NOW()
  RETURNING id INTO v_form_id;

  PERFORM public.ensure_onboarding_checklist(v_customer_id);

  IF p_submit THEN
    PERFORM public.notify_account_brief_submitted(v_customer_id);
  END IF;

  RETURN v_form_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.register_brief_attachment(
  p_storage_path TEXT,
  p_file_name TEXT,
  p_mime_type TEXT DEFAULT NULL,
  p_byte_size BIGINT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_id UUID;
  v_folder TEXT;
  v_id UUID;
BEGIN
  v_customer_id := public.my_client_customer_id();

  IF public.has_role('client') THEN
    IF v_customer_id IS NULL THEN
      RAISE EXCEPTION 'no linked customer';
    END IF;
    v_folder := split_part(p_storage_path, '/', 1);
    IF NULLIF(v_folder, '')::uuid IS DISTINCT FROM v_customer_id THEN
      RAISE EXCEPTION 'invalid storage path';
    END IF;
  ELSIF NOT (
    public.is_privileged()
    OR public.has_role('account')
    OR public.has_role('admin')
  ) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF v_customer_id IS NULL THEN
    v_customer_id := split_part(p_storage_path, '/', 1)::uuid;
  END IF;

  INSERT INTO public.brief_attachments (
    customer_id,
    storage_path,
    file_name,
    mime_type,
    byte_size,
    uploaded_by
  )
  VALUES (
    v_customer_id,
    p_storage_path,
    TRIM(p_file_name),
    NULLIF(TRIM(p_mime_type), ''),
    p_byte_size,
    auth.uid()
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- RLS brief_attachments (idempotent — safe to re-run in SQL Editor)
DROP POLICY IF EXISTS brief_attachments_select ON public.brief_attachments;
DROP POLICY IF EXISTS brief_attachments_delete ON public.brief_attachments;

CREATE POLICY brief_attachments_select ON public.brief_attachments
  FOR SELECT TO authenticated
  USING (
    public.is_privileged()
    OR public.has_role('account')
    OR public.has_role('admin')
    OR public.has_role('operations')
    OR (
      public.has_role('client')
      AND customer_id = public.my_client_customer_id()
    )
  );

CREATE POLICY brief_attachments_delete ON public.brief_attachments
  FOR DELETE TO authenticated
  USING (
    public.is_privileged()
    OR public.has_role('account')
    OR (
      public.has_role('client')
      AND customer_id = public.my_client_customer_id()
      AND uploaded_by = auth.uid()
    )
  );

-- Storage: briefs bucket
DROP POLICY IF EXISTS briefs_storage_select ON storage.objects;
DROP POLICY IF EXISTS briefs_storage_insert ON storage.objects;
DROP POLICY IF EXISTS briefs_storage_delete ON storage.objects;

CREATE POLICY briefs_storage_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'briefs'
    AND (
      public.is_privileged()
      OR public.has_role('account')
      OR public.has_role('admin')
      OR public.has_role('operations')
      OR (
        public.has_role('client')
        AND NULLIF((storage.foldername(name))[1], '')::uuid = public.my_client_customer_id()
      )
    )
  );

CREATE POLICY briefs_storage_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'briefs'
    AND (
      public.is_privileged()
      OR public.has_role('account')
      OR public.has_role('admin')
      OR (
        public.has_role('client')
        AND NULLIF((storage.foldername(name))[1], '')::uuid = public.my_client_customer_id()
      )
    )
  );

CREATE POLICY briefs_storage_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'briefs'
    AND (
      public.is_privileged()
      OR public.has_role('account')
      OR (
        public.has_role('client')
        AND NULLIF((storage.foldername(name))[1], '')::uuid = public.my_client_customer_id()
      )
    )
  );

REVOKE ALL ON FUNCTION public.notify_account_brief_submitted FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_client_onboarding_form FROM PUBLIC;
REVOKE ALL ON FUNCTION public.register_brief_attachment FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.save_client_onboarding_form TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_brief_attachment TO authenticated;
