-- Storage buckets for attachments (leads, payments, briefs)
-- Run after foundation migration

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('leads', 'leads', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('payments', 'payments', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('briefs', 'briefs', false, 52428800, NULL)
ON CONFLICT (id) DO NOTHING;

-- Leads attachments: sales own + privileged
CREATE POLICY leads_storage_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'leads'
    AND (
      public.is_privileged()
      OR (storage.foldername(name))[1] = auth.uid()::text
    )
  );

CREATE POLICY leads_storage_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'leads'
    AND (
      public.is_privileged()
      OR (storage.foldername(name))[1] = auth.uid()::text
    )
  );

-- Payments: admin + ceo only
CREATE POLICY payments_storage_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'payments'
    AND (public.is_privileged() OR public.has_role('admin'))
  );

CREATE POLICY payments_storage_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'payments'
    AND (public.is_privileged() OR public.has_role('admin'))
  );
