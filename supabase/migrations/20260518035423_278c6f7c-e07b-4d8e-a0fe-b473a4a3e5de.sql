
ALTER TABLE public.idia_schema_manifest_vault
  DROP CONSTRAINT IF EXISTS idia_schema_manifest_vault_business_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS idia_schema_manifest_vault_pairing_code_key
  ON public.idia_schema_manifest_vault(pairing_code);
