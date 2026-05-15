-- Phase 3 / Sprint 13: ฐานข้อมูล Creator (TikTok / UGC)

CREATE TYPE public.creator_status AS ENUM ('active', 'inactive', 'blacklist');

CREATE TABLE public.creators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name TEXT NOT NULL,
  tiktok_handle TEXT,
  line_id TEXT,
  phone TEXT,
  niche TEXT,
  rate_per_clip NUMERIC(12, 2),
  status public.creator_status NOT NULL DEFAULT 'active',
  notes TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX creators_status_idx ON public.creators (status);
CREATE INDEX creators_display_name_idx ON public.creators (display_name);

CREATE TRIGGER creators_set_updated_at
  BEFORE UPDATE ON public.creators
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.creators ENABLE ROW LEVEL SECURITY;

CREATE POLICY creators_select ON public.creators
  FOR SELECT TO authenticated
  USING (
    public.is_privileged()
    OR public.has_any_role(
      ARRAY['content', 'account', 'operations']::public.app_role[]
    )
  );

CREATE POLICY creators_insert ON public.creators
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND (
      public.is_privileged()
      OR public.has_role('content')
      OR public.has_role('account')
    )
  );

CREATE POLICY creators_update ON public.creators
  FOR UPDATE TO authenticated
  USING (
    public.is_privileged()
    OR public.has_role('content')
    OR public.has_role('account')
  )
  WITH CHECK (
    public.is_privileged()
    OR public.has_role('content')
    OR public.has_role('account')
  );

CREATE POLICY creators_delete ON public.creators
  FOR DELETE TO authenticated
  USING (public.is_privileged());
