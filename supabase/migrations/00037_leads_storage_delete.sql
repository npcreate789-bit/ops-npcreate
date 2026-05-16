-- ลบไฟล์แนบ Lead: เจ้าของโฟลเดอร์หรือ privileged (สอดคล้อง insert)

DROP POLICY IF EXISTS leads_storage_delete ON storage.objects;

CREATE POLICY leads_storage_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'leads'
    AND (
      public.is_privileged()
      OR (storage.foldername(name))[1] = auth.uid()::text
    )
  );
