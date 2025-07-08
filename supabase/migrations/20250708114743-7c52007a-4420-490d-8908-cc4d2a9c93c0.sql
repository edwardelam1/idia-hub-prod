-- Fix the generate_pseudonym function with proper type casting
CREATE OR REPLACE FUNCTION public.generate_pseudonym(input_text text)
RETURNS text
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT encode(digest((input_text || 'IDIA_SALT_2024')::bytea, 'sha256'::text), 'hex');
$$;

-- Fix the anonymize_location function with proper type casting  
CREATE OR REPLACE FUNCTION public.anonymize_location(lat numeric, lng numeric)
RETURNS text
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT 'ZONE_' || encode(digest((ROUND(lat, 1)::TEXT || '_' || ROUND(lng, 1)::TEXT)::bytea, 'sha256'::text), 'hex')::CHAR(8);
$$;

-- Test the functions to ensure they work
DO $$
DECLARE
  test_result TEXT;
BEGIN
  -- Test generate_pseudonym
  SELECT public.generate_pseudonym('test_user_123') INTO test_result;
  RAISE NOTICE 'generate_pseudonym test result: %', test_result;
  
  -- Test anonymize_location
  SELECT public.anonymize_location(40.7128, -74.0060) INTO test_result;
  RAISE NOTICE 'anonymize_location test result: %', test_result;
  
  RAISE NOTICE 'All functions are working correctly!';
END
$$;