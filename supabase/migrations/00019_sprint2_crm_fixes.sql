-- Sprint 2: admin ดู leads ทั้งหมด (read-only ผ่าน RLS อื่น), อ่านไฟล์แนบ leads

DROP POLICY IF EXISTS leads_select ON public.leads;

CREATE POLICY leads_select ON public.leads
  FOR SELECT TO authenticated
  USING (
    public.is_privileged()
    OR public.has_role('admin')
    OR owner_id = auth.uid()
  );

DROP POLICY IF EXISTS leads_storage_select ON storage.objects;

CREATE POLICY leads_storage_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'leads'
    AND (
      public.is_privileged()
      OR public.has_role('admin')
      OR (storage.foldername(name))[1] = auth.uid()::text
    )
  );
