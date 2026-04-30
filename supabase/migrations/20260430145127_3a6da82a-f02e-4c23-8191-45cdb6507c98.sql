-- Generator function for provisioning codes
CREATE OR REPLACE FUNCTION public.generate_business_provisioning_code()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  alphabet TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  candidate TEXT;
  i INT;
  exists_count INT;
BEGIN
  LOOP
    candidate := 'IDIA-';
    FOR i IN 1..4 LOOP
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    END LOOP;
    candidate := candidate || '-';
    FOR i IN 1..4 LOOP
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    END LOOP;
    SELECT COUNT(*) INTO exists_count FROM public.businesses WHERE provisioning_code = candidate;
    EXIT WHEN exists_count = 0;
  END LOOP;
  RETURN candidate;
END;
$$;

-- Add the column
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS provisioning_code TEXT;

-- Backfill existing rows
UPDATE public.businesses
  SET provisioning_code = public.generate_business_provisioning_code()
  WHERE provisioning_code IS NULL;

-- Enforce NOT NULL + uniqueness
ALTER TABLE public.businesses
  ALTER COLUMN provisioning_code SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS businesses_provisioning_code_key
  ON public.businesses (provisioning_code);

-- Default + trigger for new rows
CREATE OR REPLACE FUNCTION public.set_business_provisioning_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.provisioning_code IS NULL OR NEW.provisioning_code = '' THEN
    NEW.provisioning_code := public.generate_business_provisioning_code();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_business_provisioning_code ON public.businesses;
CREATE TRIGGER trg_set_business_provisioning_code
  BEFORE INSERT ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.set_business_provisioning_code();