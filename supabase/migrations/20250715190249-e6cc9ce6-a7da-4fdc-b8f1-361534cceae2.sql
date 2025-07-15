-- Update the processing trigger to handle Apple Health data properly
-- and ensure it passes the correct data structure to the anonymize-and-stage-data function

CREATE OR REPLACE FUNCTION trigger_apple_health_processing()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger processing for unprocessed raw health data
  IF NEW.processed = false AND (OLD.processed IS NULL OR OLD.processed = false) THEN
    RAISE LOG 'Triggering Apple Health processing for raw_data_id: %', NEW.id;
    
    -- Call the anonymize-and-stage-data function with proper data structure
    PERFORM net.http_post(
      'https://zxyngqciipcvveigrzqt.supabase.co/functions/v1/anonymize-and-stage-data'::text,
      json_build_object(
        'rawData', NEW.raw_payload || json_build_object(
          'id', NEW.id,
          'source', COALESCE(NEW.raw_payload->>'source', 'apple_health'),
          'step_count', NEW.step_count,
          'recorded_at', NEW.recorded_at,
          'device_type', NEW.device_type
        ),
        'userId', NEW.user_id,
        'connectionId', null
      )::jsonb,
      '{}'::jsonb,
      '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4eW5ncWNpaXBjdnZlaWdyenF0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTMyMjA3NiwiZXhwIjoyMDY2ODk4MDc2fQ.G0Nj4rG9N6N2MKlf9xYyPRXA9WJQx8ZhxqCMM-tpMWY"}'::jsonb,
      5000
    );
    
    RAISE LOG 'Apple Health processing triggered for raw_data_id: %', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists and create new one
DROP TRIGGER IF EXISTS apple_health_processing_trigger ON raw_health_data;
CREATE TRIGGER apple_health_processing_trigger
  AFTER INSERT OR UPDATE ON raw_health_data
  FOR EACH ROW
  EXECUTE FUNCTION trigger_apple_health_processing();