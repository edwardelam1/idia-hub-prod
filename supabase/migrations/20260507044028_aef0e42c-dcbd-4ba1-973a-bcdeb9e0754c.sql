ALTER TABLE public.device_provisioning_blueprints
  ADD COLUMN IF NOT EXISTS label TEXT NOT NULL DEFAULT 'Untitled Schema';

CREATE INDEX IF NOT EXISTS idx_dpb_business_id
  ON public.device_provisioning_blueprints(business_id);