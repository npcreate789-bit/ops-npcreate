-- Phase 3 / Sprint 12: แจ้งเตือนส่วนตัว (sync จากกฎระบบ)

CREATE TABLE public.user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  dedupe_key TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  link TEXT,
  severity TEXT NOT NULL DEFAULT 'warn'
    CHECK (severity IN ('info', 'warn', 'danger')),
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, dedupe_key)
);

CREATE INDEX user_notifications_user_unread_idx
  ON public.user_notifications (user_id, created_at DESC)
  WHERE read_at IS NULL;

CREATE TRIGGER user_notifications_set_updated_at
  BEFORE UPDATE ON public.user_notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_notifications_select ON public.user_notifications
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_privileged()
  );

CREATE POLICY user_notifications_insert ON public.user_notifications
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY user_notifications_update ON public.user_notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY user_notifications_delete ON public.user_notifications
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_privileged());
