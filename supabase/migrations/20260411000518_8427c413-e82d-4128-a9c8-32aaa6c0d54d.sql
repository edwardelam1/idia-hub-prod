
-- Remove PII column from profiles
ALTER TABLE public.profiles DROP COLUMN IF EXISTS display_name;

-- Add comment documenting zero-PII policy
COMMENT ON TABLE public.profiles IS 'Zero-PII profile table. All personally identifiable information (name, email) is held in IDIA Life Secure Enclave on-device only. Hub stores only platform_guid and non-PII metadata.';

-- Fix handle_new_user trigger - stop writing PII fields that don't exist
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  INSERT INTO public.profiles (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  INSERT INTO public.user_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$;
