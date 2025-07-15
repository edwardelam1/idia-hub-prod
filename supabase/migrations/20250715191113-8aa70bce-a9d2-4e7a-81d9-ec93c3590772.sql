-- Create a trigger to automatically generate bundles when new staged health data is inserted
-- This removes the artificial thresholds and makes bundle generation immediate

CREATE OR REPLACE FUNCTION trigger_bundle_generation()
RETURNS TRIGGER AS $$
BEGIN
  -- Call the bundle generation function for immediate processing
  PERFORM net.http_post(
    'https://zxyngqciipcvveigrzqt.supabase.co/functions/v1/create-health-data-bundle'::text,
    json_build_object(
      'trigger', 'real_time',
      'force_process', true,
      'staged_data_id', NEW.id
    )::jsonb,
    '{}'::jsonb,
    '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4eW5ncWNpaXBjdnZlaWdyenF0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTMyMjA3NiwiZXhwIjoyMDY2ODk4MDc2fQ.G0Nj4rG9N6N2MKlf9xYyPRXA9WJQx8ZhxqCMM-tpMWY"}'::jsonb,
    5000
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for immediate bundle generation
DROP TRIGGER IF EXISTS immediate_bundle_generation ON staged_health_data;
CREATE TRIGGER immediate_bundle_generation
  AFTER INSERT ON staged_health_data
  FOR EACH ROW
  EXECUTE FUNCTION trigger_bundle_generation();