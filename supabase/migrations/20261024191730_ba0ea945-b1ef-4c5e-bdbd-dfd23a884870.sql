CREATE TABLE public.security_ticker (
  id uuid PRIMARY KEY,
  agent text NOT NULL,
  event_type text NOT NULL,
  severity text NOT NULL,
  resolved boolean NOT NULL DEFAULT false,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.security_ticker TO anon, authenticated;
GRANT ALL ON public.security_ticker TO service_role;
ALTER TABLE public.security_ticker ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read sanitized ticker" ON public.security_ticker FOR SELECT TO anon, authenticated USING (true);

CREATE OR REPLACE FUNCTION public.sync_security_ticker()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.security_ticker(id, agent, event_type, severity, resolved, occurred_at)
  VALUES (NEW.id,
    left(regexp_replace(lower(NEW.agent_name), '[^a-z0-9_]', '', 'g'), 40),
    left(regexp_replace(lower(NEW.action_type), '[^a-z0-9_]', '', 'g'), 60),
    CASE WHEN lower(NEW.severity) IN ('low','medium','high','critical') THEN lower(NEW.severity) ELSE 'low' END,
    coalesce(NEW.resolved,false), coalesce(NEW.timestamp, now()))
  ON CONFLICT (id) DO UPDATE SET resolved = EXCLUDED.resolved, severity = EXCLUDED.severity;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.sync_security_ticker() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_sync_security_ticker AFTER INSERT OR UPDATE ON public.security_events
FOR EACH ROW EXECUTE FUNCTION public.sync_security_ticker();

INSERT INTO public.security_ticker(id, agent, event_type, severity, resolved, occurred_at)
SELECT id, left(regexp_replace(lower(agent_name), '[^a-z0-9_]', '', 'g'),40),
  left(regexp_replace(lower(action_type), '[^a-z0-9_]', '', 'g'),60),
  CASE WHEN lower(severity) IN ('low','medium','high','critical') THEN lower(severity) ELSE 'low' END,
  coalesce(resolved,false), timestamp
FROM public.security_events ORDER BY timestamp DESC LIMIT 500
ON CONFLICT DO NOTHING;

CREATE TABLE public.security_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(title) BETWEEN 3 AND 160),
  body text NOT NULL CHECK (char_length(body) <= 4000),
  category text NOT NULL DEFAULT 'milestone' CHECK (category IN ('milestone','compliance','advisory')),
  effective_date date NOT NULL DEFAULT current_date,
  published boolean NOT NULL DEFAULT true,
  author_id uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.security_milestones TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.security_milestones TO authenticated;
GRANT ALL ON public.security_milestones TO service_role;
ALTER TABLE public.security_milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads published milestones" ON public.security_milestones FOR SELECT TO anon, authenticated
  USING (published OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "Super admins insert milestones" ON public.security_milestones FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'super_admin') AND author_id = auth.uid());
CREATE POLICY "Super admins update milestones" ON public.security_milestones FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "Super admins delete milestones" ON public.security_milestones FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'super_admin'));

ALTER PUBLICATION supabase_realtime ADD TABLE public.security_ticker;
ALTER PUBLICATION supabase_realtime ADD TABLE public.security_milestones;