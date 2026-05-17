-- แจ้งเตือนคำขอติดต่อจากฟอร์มสาธารณะ (channel = website) แยกจาก Lead ทั่วไป

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
  v_title TEXT;
  v_is_inquiry BOOLEAN;
BEGIN
  v_is_inquiry := NEW.channel = 'website';
  v_contact := COALESCE(NULLIF(TRIM(NEW.contact_name), ''), 'ยังไม่ระบุผู้ติดต่อ');

  IF v_is_inquiry THEN
    v_dedupe := 'inquiry-new-' || NEW.id::text;
    v_title := 'คำขอติดต่อ: ' || NEW.brand_name;
  ELSE
    v_dedupe := 'lead-new-' || NEW.id::text;
    v_title := 'Lead ใหม่: ' || NEW.brand_name;
  END IF;

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
      v_title,
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
