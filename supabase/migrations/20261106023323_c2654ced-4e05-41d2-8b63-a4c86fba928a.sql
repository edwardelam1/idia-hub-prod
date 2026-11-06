ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS legal_name text,
  ADD COLUMN IF NOT EXISTS dba_name text,
  ADD COLUMN IF NOT EXISTS tax_id_type text,
  ADD COLUMN IF NOT EXISTS irs_tax_classification text,
  ADD COLUMN IF NOT EXISTS state_of_formation text;
ALTER TABLE public.businesses
  ADD CONSTRAINT businesses_tax_id_type_chk CHECK (tax_id_type IS NULL OR tax_id_type IN ('EIN','SSN','ITIN')),
  ADD CONSTRAINT businesses_irs_class_chk CHECK (irs_tax_classification IS NULL OR irs_tax_classification IN ('c_corp','s_corp','partnership','llc_single','llc_c','llc_s','llc_partnership','sole_proprietor','nonprofit','trust_estate'));