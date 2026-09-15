CREATE TABLE public.mesh_gateway_state (
  id TEXT PRIMARY KEY DEFAULT 'singleton',
  is_open BOOLEAN NOT NULL DEFAULT false,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.mesh_gateway_state TO authenticated;
GRANT ALL ON public.mesh_gateway_state TO service_role;

ALTER TABLE public.mesh_gateway_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read gateway state"
ON public.mesh_gateway_state FOR SELECT TO authenticated USING (true);

CREATE POLICY "C-suite can open gateway"
ON public.mesh_gateway_state FOR INSERT TO authenticated
WITH CHECK (public.is_csuite(auth.uid()));

CREATE POLICY "C-suite can change gateway state"
ON public.mesh_gateway_state FOR UPDATE TO authenticated
USING (public.is_csuite(auth.uid()))
WITH CHECK (public.is_csuite(auth.uid()));

CREATE TRIGGER mesh_gateway_state_touch
BEFORE UPDATE ON public.mesh_gateway_state
FOR EACH ROW EXECUTE FUNCTION public.gl_touch_updated_at();

INSERT INTO public.mesh_gateway_state (id, is_open) VALUES ('singleton', false);