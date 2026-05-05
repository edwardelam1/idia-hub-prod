
CREATE TABLE IF NOT EXISTS public.idia_schema_manifest_vault (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL UNIQUE REFERENCES public.businesses(id) ON DELETE CASCADE,
  pairing_code text NOT NULL,
  schema_payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_manifest_vault_pairing_code
  ON public.idia_schema_manifest_vault(pairing_code);

ALTER TABLE public.idia_schema_manifest_vault ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins can read their vault"
  ON public.idia_schema_manifest_vault
  FOR SELECT
  USING (public.is_org_admin(business_id));

CREATE POLICY "Org admins can insert their vault"
  ON public.idia_schema_manifest_vault
  FOR INSERT
  WITH CHECK (public.is_org_admin(business_id));

CREATE POLICY "Org admins can update their vault"
  ON public.idia_schema_manifest_vault
  FOR UPDATE
  USING (public.is_org_admin(business_id))
  WITH CHECK (public.is_org_admin(business_id));

CREATE TRIGGER trg_manifest_vault_updated_at
  BEFORE UPDATE ON public.idia_schema_manifest_vault
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
