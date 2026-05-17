-- แจ้งเตือน Lead ใหม่แบบเรียลไทม์ (คงอยู่จนกว่าผู้ใช้จะอ่าน/รับทราบ)

ALTER TABLE public.user_notifications REPLICA IDENTITY FULL;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.user_notifications;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.notify_users_of_new_lead()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recipient UUID;
  v_contact TEXT;
  v_dedupe TEXT;
BEGIN
  v_contact := COALESCE(NULLIF(TRIM(NEW.contact_name), ''), 'ยังไม่ระบุผู้ติดต่อ');
  v_dedupe := 'lead-new-' || NEW.id::text;

  FOR v_recipient IN
    SELECT DISTINCT p.id
    FROM public.profiles p
    WHERE p.is_active = TRUE
      AND (
        p.id = NEW.owner_id
        OR EXISTS (
          SELECT 1
          FROM public.user_roles ur
          WHERE ur.user_id = p.id
            AND ur.role IN (
              'sales'::public.app_role,
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
      'Lead ใหม่: ' || NEW.brand_name,
      v_contact,
      '/app/crm/' || NEW.id::text,
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

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS leads_notify_new_lead ON public.leads;
CREATE TRIGGER leads_notify_new_lead
  AFTER INSERT ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_users_of_new_lead();
