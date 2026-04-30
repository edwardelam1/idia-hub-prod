ALTER TABLE public.businesses
  ALTER COLUMN provisioning_code SET DEFAULT public.generate_business_provisioning_code();