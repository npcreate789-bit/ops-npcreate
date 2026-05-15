-- Sprint 2 — CRM Leads (schema ready; UI in next sprint)

CREATE TYPE public.lead_status AS ENUM (
  'interested',
  'scheduled',
  'quotation_sent',
  'awaiting_payment',
  'won',
  'not_interested',
  'follow_up'
);

CREATE TYPE public.lead_channel AS ENUM (
  'facebook',
  'tiktok',
  'website',
  'line',
  'referral',
  'other'
);

CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles (id),
  brand_name TEXT NOT NULL,
  contact_name TEXT,
  phone TEXT,
  line_id TEXT,
  facebook TEXT,
  business_type TEXT,
  ad_budget_daily NUMERIC(12, 2),
  ad_budget_monthly NUMERIC(12, 2),
  pain_points TEXT,
  services_interested TEXT[] NOT NULL DEFAULT '{}',
  status public.lead_status NOT NULL DEFAULT 'interested',
  channel public.lead_channel NOT NULL DEFAULT 'other',
  notes TEXT,
  reminder_at TIMESTAMPTZ,
  customer_id UUID,
  converted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX leads_owner_id_idx ON public.leads (owner_id);
CREATE INDEX leads_status_idx ON public.leads (status);
CREATE INDEX leads_reminder_at_idx ON public.leads (reminder_at) WHERE reminder_at IS NOT NULL;

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY leads_select ON public.leads
  FOR SELECT TO authenticated
  USING (public.is_privileged() OR owner_id = auth.uid());

CREATE POLICY leads_insert ON public.leads
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_privileged()
    OR (owner_id = auth.uid() AND public.has_role('sales'))
  );

CREATE POLICY leads_update ON public.leads
  FOR UPDATE TO authenticated
  USING (
    public.is_privileged()
    OR owner_id = auth.uid()
  )
  WITH CHECK (
    public.is_privileged()
    OR owner_id = auth.uid()
  );

CREATE POLICY leads_delete ON public.leads
  FOR DELETE TO authenticated
  USING (public.is_privileged());
