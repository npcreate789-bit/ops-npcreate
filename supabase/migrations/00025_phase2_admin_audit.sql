-- Phase 2 / Sprint 9: audit helper, profiles read for team directory

CREATE OR REPLACE FUNCTION public.log_audit(
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), p_action, p_entity_type, p_entity_id, COALESCE(p_metadata, '{}'))
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.log_audit(TEXT, TEXT, UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_audit(TEXT, TEXT, UUID, JSONB) TO authenticated;

-- รายชื่อพนักงานสำหรับ dropdown (อ่านได้ทุก authenticated)
CREATE POLICY profiles_select_team ON public.profiles
  FOR SELECT TO authenticated
  USING (is_active = TRUE);
