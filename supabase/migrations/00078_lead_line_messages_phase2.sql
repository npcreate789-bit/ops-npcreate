-- Phase 2: metadata สำหรับสื่อ/สติกเกอร์ + แจ้งเตือนข้อความ LINE เข้า

ALTER TABLE public.lead_line_messages
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.lead_line_messages.metadata IS
  'LINE payload extras (sticker ids, content ids, location, file name, etc.)';

CREATE OR REPLACE FUNCTION public.notify_users_of_lead_line_inbound()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead public.leads%ROWTYPE;
  v_recipient UUID;
  v_preview TEXT;
  v_dedupe TEXT;
BEGIN
  IF NEW.direction <> 'inbound'::public.lead_line_message_direction THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_lead FROM public.leads WHERE id = NEW.lead_id;
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  v_preview := left(trim(NEW.body), 120);
  v_dedupe := 'lead-line-msg-' || NEW.lead_id::text;

  FOR v_recipient IN
    SELECT DISTINCT p.id
    FROM public.profiles p
    WHERE p.is_active = TRUE
      AND (
        p.id = v_lead.owner_id
        OR EXISTS (
          SELECT 1
          FROM public.user_roles ur
          WHERE ur.user_id = p.id
            AND ur.role IN (
              'sales'::public.app_role,
              'operations'::public.app_role,
              'ceo'::public.app_role,
              'dev'::public.app_role,
              'admin'::public.app_role
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
      'LINE: ' || v_lead.brand_name,
      v_preview,
      '/app/crm/' || NEW.lead_id::text,
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

DROP TRIGGER IF EXISTS lead_line_messages_notify_inbound ON public.lead_line_messages;
CREATE TRIGGER lead_line_messages_notify_inbound
  AFTER INSERT ON public.lead_line_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_users_of_lead_line_inbound();
