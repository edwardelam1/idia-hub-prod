ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS compliance_rail text;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_compliance_rail_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_compliance_rail_check CHECK (compliance_rail IS NULL OR compliance_rail IN ('fiat','on-chain'));