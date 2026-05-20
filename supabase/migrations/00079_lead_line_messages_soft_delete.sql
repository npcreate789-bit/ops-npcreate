-- Soft delete ข้อความ outbound + RPC สำหรับทีม

ALTER TABLE public.lead_line_messages
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL;

COMMENT ON COLUMN public.lead_line_messages.deleted_at IS
  'เมื่อตั้งค่า แสดงเป็นข้อความถูกลบใน CRM (ไม่ลบใน LINE ของลูกค้า)';

CREATE OR REPLACE FUNCTION public.soft_delete_lead_line_message(p_message_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.lead_line_messages%ROWTYPE;
BEGIN
  SELECT * INTO v_row
  FROM public.lead_line_messages
  WHERE id = p_message_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ไม่พบข้อความ';
  END IF;

  IF v_row.direction <> 'outbound'::public.lead_line_message_direction THEN
    RAISE EXCEPTION 'ลบได้เฉพาะข้อความที่ทีมส่งจากระบบ';
  END IF;

  IF v_row.deleted_at IS NOT NULL THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.leads l
    WHERE l.id = v_row.lead_id
      AND (
        public.is_privileged()
        OR public.has_role('admin')
        OR l.owner_id = auth.uid()
      )
  ) THEN
    RAISE EXCEPTION 'ไม่มีสิทธิ์ลบข้อความนี้';
  END IF;

  UPDATE public.lead_line_messages
  SET
    deleted_at = NOW(),
    deleted_by = auth.uid()
  WHERE id = p_message_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.soft_delete_lead_line_message(UUID) TO authenticated;
