-- Hotfix: รันซ้ำได้เมื่อ 00050 หยุดที่ policy ซ้ำ (42710)
-- วางใน SQL Editor แล้วรันส่วนที่เหลือของ 00050 ต่อจากบรรทัดนี้

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
