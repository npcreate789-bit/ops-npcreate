-- Phase 3: สิทธิ์ creators ให้สอดคล้อง UI (operations จัดการได้)

DROP POLICY IF EXISTS creators_insert ON public.creators;
CREATE POLICY creators_insert ON public.creators
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND (
      public.is_privileged()
      OR public.has_role('content')
      OR public.has_role('account')
      OR public.has_role('operations')
    )
  );

DROP POLICY IF EXISTS creators_update ON public.creators;
CREATE POLICY creators_update ON public.creators
  FOR UPDATE TO authenticated
  USING (
    public.is_privileged()
    OR public.has_role('content')
    OR public.has_role('account')
    OR public.has_role('operations')
  )
  WITH CHECK (
    public.is_privileged()
    OR public.has_role('content')
    OR public.has_role('account')
    OR public.has_role('operations')
  );
