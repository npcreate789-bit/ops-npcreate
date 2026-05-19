-- CRM: แชท LINE ต่อ Lead (Messaging API webhook + push จากทีม)
-- Idempotent: รองรับกรณี apply ด้วย db query ก่อนบันทึกใน schema_migrations

DO $$
BEGIN
  CREATE TYPE public.lead_line_message_direction AS ENUM ('inbound', 'outbound');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.lead_line_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads (id) ON DELETE CASCADE,
  line_user_id TEXT NOT NULL,
  direction public.lead_line_message_direction NOT NULL,
  body TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text',
  line_message_id TEXT UNIQUE,
  sender_profile_id UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT lead_line_messages_body_len CHECK (char_length(trim(body)) BETWEEN 1 AND 5000)
);

CREATE INDEX IF NOT EXISTS lead_line_messages_lead_created_idx
  ON public.lead_line_messages (lead_id, created_at);

CREATE INDEX IF NOT EXISTS lead_line_messages_line_user_id_idx
  ON public.lead_line_messages (line_user_id);

ALTER TABLE public.lead_line_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lead_line_messages_select ON public.lead_line_messages;
CREATE POLICY lead_line_messages_select ON public.lead_line_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.leads l
      WHERE l.id = lead_id
        AND (
          public.is_privileged()
          OR public.has_role('admin')
          OR l.owner_id = auth.uid()
        )
    )
  );

-- webhook / edge functions ใช้ service_role

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_line_messages;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
