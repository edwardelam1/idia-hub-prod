-- Device provisioning blueprints: payloads consumed by IDIA Pay edge devices for hydration.
CREATE TABLE public.device_provisioning_blueprints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_dpb_business_id ON public.device_provisioning_blueprints(business_id);
CREATE INDEX idx_dpb_status ON public.device_provisioning_blueprints(status);

ALTER TABLE public.device_provisioning_blueprints ENABLE ROW LEVEL SECURITY;

-- Authenticated Hub operators can read, write, and update blueprints.
-- (Edge device hydration goes through edge functions using the service role.)
CREATE POLICY "Authenticated users can view blueprints"
  ON public.device_provisioning_blueprints
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert blueprints"
  ON public.device_provisioning_blueprints
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update blueprints"
  ON public.device_provisioning_blueprints
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete blueprints"
  ON public.device_provisioning_blueprints
  FOR DELETE
  TO authenticated
  USING (true);

-- Auto-update updated_at on row changes.
CREATE TRIGGER update_dpb_updated_at
  BEFORE UPDATE ON public.device_provisioning_blueprints
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();