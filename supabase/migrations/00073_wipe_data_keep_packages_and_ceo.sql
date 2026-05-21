-- ลบข้อมูลการติดต่อ / ปฏิบัติการทั้งหมด — เก็บ master (packages, snippets, products, settings) และผู้ใช้ทุกคน
-- เรียก: SELECT public.admin_wipe_data_keep_packages_and_ceo('WIPE_KEEP_PACKAGES_CEO');
-- หรือ: npm run db:wipe

CREATE OR REPLACE FUNCTION public.admin_wipe_data_keep_packages_and_ceo(p_confirm TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_packages INT;
  v_snippets INT;
  v_products INT;
  v_users INT;
BEGIN
  IF p_confirm IS DISTINCT FROM 'WIPE_KEEP_PACKAGES_CEO' THEN
    RAISE EXCEPTION 'ยืนยันไม่ถูกต้อง — ใช้ admin_wipe_data_keep_packages_and_ceo(''WIPE_KEEP_PACKAGES_CEO'')';
  END IF;

  TRUNCATE TABLE
    public.chat_message_mentions,
    public.chat_message_reactions,
    public.chat_message_notes,
    public.chat_pinned_messages,
    public.chat_messages,
    public.chat_room_reads,
    public.chat_rooms,
    public.chat_message_templates,
    public.lead_line_messages,
    public.brief_attachments,
    public.quotation_items,
    public.quotations,
    public.payments,
    public.daily_metrics,
    public.campaigns,
    public.tasks,
    public.content_jobs,
    public.onboarding_checklist,
    public.onboarding_forms,
    public.contract_renewals,
    public.client_customer_access,
    public.projects,
    public.customers,
    public.leads,
    public.creators,
    public.user_notifications,
    public.assistant_usage_logs,
    public.audit_logs,
    public.public_inquiry_attempts
  RESTART IDENTITY CASCADE;

  SELECT COUNT(*)::INT INTO v_packages FROM public.packages;
  SELECT COUNT(*)::INT INTO v_snippets FROM public.line_message_snippets;
  SELECT COUNT(*)::INT INTO v_products FROM public.products;
  SELECT COUNT(*)::INT INTO v_users FROM auth.users;

  RETURN jsonb_build_object(
    'ok', TRUE,
    'packages_kept', v_packages,
    'line_snippets_kept', v_snippets,
    'products_kept', v_products,
    'auth_users_kept', v_users,
    'note', 'เก็บ packages · line snippets · products · platform_settings · ผู้ใช้ทั้งหมด — Storage ล้างแยกถ้าต้องการ'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_wipe_data_keep_packages_and_ceo(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_wipe_data_keep_packages_and_ceo(TEXT) FROM authenticated;
REVOKE ALL ON FUNCTION public.admin_wipe_data_keep_packages_and_ceo(TEXT) FROM anon;

COMMENT ON FUNCTION public.admin_wipe_data_keep_packages_and_ceo(TEXT) IS
  'ลบข้อมูลการติดต่อและงานปฏิบัติการ — เก็บ master data และผู้ใช้ทั้งหมด — service role เท่านั้น';
