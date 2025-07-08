-- Enable pgcrypto extension for digest() function support
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Verify that our existing functions work with the extension enabled
-- Test the generate_pseudonym function
DO $$
BEGIN
  PERFORM public.generate_pseudonym('test_user_id');
  RAISE NOTICE 'generate_pseudonym function is working correctly';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error testing generate_pseudonym: %', SQLERRM;
END
$$;

-- Test the anonymize_location function
DO $$
BEGIN
  PERFORM public.anonymize_location(40.7128, -74.0060);
  RAISE NOTICE 'anonymize_location function is working correctly';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error testing anonymize_location: %', SQLERRM;
END
$$;