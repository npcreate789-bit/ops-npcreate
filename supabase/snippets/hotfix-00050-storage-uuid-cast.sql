-- แก้ ERROR 42883: operator does not exist: text = uuid
-- รันหลัง migration 00050 ล้มที่ storage policy (หรือก่อนรัน policies ซ้ำ)

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
