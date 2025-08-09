-- Clean bundle generation logs first to avoid foreign key constraint
DELETE FROM bundle_generation_logs WHERE bundle_id IN (
  SELECT bundle_id FROM marketplace_bundles WHERE title LIKE '%Health%' OR title LIKE '%HealthKit%'
);

-- Clean all simulated data from health-related tables with proper type casting
DELETE FROM staged_health_data WHERE pseudo_user_id LIKE 'healthkit_user_%' OR pseudo_user_id LIKE 'RECORD_%';
DELETE FROM raw_health_data WHERE device_type IN ('iPhone', 'Apple Watch', 'iPad', 'HealthKit App') AND processing_status = 'completed' AND step_count BETWEEN 3000 AND 18000;
DELETE FROM marketplace_bundles WHERE title LIKE '%Health%' OR title LIKE '%HealthKit%';
DELETE FROM health_metrics WHERE device_type IN ('iPhone', 'Apple Watch', 'iPad', 'HealthKit App');

-- Add constraint to prevent simulated data insertion
ALTER TABLE staged_health_data ADD CONSTRAINT no_simulated_healthkit_users 
CHECK (pseudo_user_id NOT LIKE 'healthkit_user_%' AND pseudo_user_id NOT LIKE 'RECORD_%');

-- Update processing triggers to only handle real user data
CREATE OR REPLACE FUNCTION public.validate_real_health_data()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only allow health data with realistic patterns and real user IDs
  IF NEW.user_id IS NULL OR 
     NEW.step_count > 50000 OR 
     NEW.step_count < 0 OR
     (NEW.raw_payload->>'heart_rate')::integer > 220 OR
     (NEW.raw_payload->>'heart_rate')::integer < 30 THEN
    RAISE EXCEPTION 'Invalid health data: unrealistic values detected';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Add validation trigger
CREATE TRIGGER validate_health_data_trigger
  BEFORE INSERT ON raw_health_data
  FOR EACH ROW
  EXECUTE FUNCTION validate_real_health_data();