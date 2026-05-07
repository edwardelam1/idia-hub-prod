
CREATE TABLE public.hub_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  body text,
  category text NOT NULL DEFAULT 'general',
  severity text NOT NULL DEFAULT 'info',
  link text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_hub_notifications_user_created ON public.hub_notifications (user_id, created_at DESC);
CREATE INDEX idx_hub_notifications_user_unread ON public.hub_notifications (user_id) WHERE read_at IS NULL;

ALTER TABLE public.hub_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own hub notifications"
  ON public.hub_notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own hub notifications"
  ON public.hub_notifications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own hub notifications"
  ON public.hub_notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own hub notifications"
  ON public.hub_notifications FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.hub_notifications;
ALTER TABLE public.hub_notifications REPLICA IDENTITY FULL;
