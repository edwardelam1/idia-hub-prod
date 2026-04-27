-- Generate marketplace bundles from the new staged data
SELECT net.http_post(
  'https://zxyngqciipcvveigrzqt.supabase.co/functions/v1/trigger-comprehensive-bundle-generation'::text,
  '{"trigger": "post_data_processing", "comprehensive_bundle_generation": true}'::jsonb,
  '{}'::jsonb,
  '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4eW5ncWNpaXBjdnZlaWdyenF0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTMyMjA3NiwiZXhwIjoyMDY2ODk4MDc2fQ.G0Nj4rG9N6N2MKlf9xYyPRXA9WJQx8ZhxqCMM-tpMWY"}'::jsonb,
  5000
) as bundle_generation_result;

-- Set up automatic processing triggers to ensure future data is processed automatically
CREATE OR REPLACE FUNCTION public.auto_process_raw_health_data()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- If this is a new pending record, automatically process it
  IF NEW.processing_status = 'pending' AND TG_OP = 'INSERT' THEN
    -- Insert directly into health_metrics
    INSERT INTO health_metrics (
      user_id,
      device_type, 
      activity_type,
      step_count,
      heart_rate,
      distance_meters,
      duration_seconds,
      calories_burned,
      recorded_at,
      raw_data
    ) VALUES (
      NEW.user_id,
      COALESCE(NEW.device_type, 'Unknown'),
      'health_tracking',
      NEW.step_count,
      COALESCE((NEW.raw_payload->>'heart_rate')::integer, NULL),
      COALESCE((NEW.raw_payload->>'distance')::numeric, NULL),
      COALESCE((NEW.raw_payload->>'duration')::integer, NULL),
      COALESCE((NEW.raw_payload->>'calories')::integer, NULL),
      NEW.recorded_at,
      NEW.raw_payload
    );
    
    -- Mark as completed
    NEW.processing_status := 'completed';
    NEW.processing_completed_at := NOW();
    NEW.processed := TRUE;
    
    -- Insert into staged data for marketplace
    INSERT INTO staged_health_data (
      pseudo_user_id,
      device_type,
      activity_type,
      steps_count,
      average_heartrate,
      distance_meters,
      duration_seconds,
      calories_burned,
      data_quality_score,
      data_completeness_score,
      processed_at
    ) VALUES (
      generate_pseudonym(NEW.user_id::text),
      COALESCE(NEW.device_type, 'Unknown'),
      'health_tracking',
      NEW.step_count,
      COALESCE((NEW.raw_payload->>'heart_rate')::integer, NULL),
      COALESCE((NEW.raw_payload->>'distance')::numeric, NULL),
      COALESCE((NEW.raw_payload->>'duration')::integer, NULL),
      COALESCE((NEW.raw_payload->>'calories')::integer, NULL),
      calculate_data_quality_score(
        COALESCE((NEW.raw_payload->>'heart_rate')::integer, NULL),
        NULL,
        COALESCE((NEW.raw_payload->>'duration')::integer, NULL),
        COALESCE((NEW.raw_payload->>'distance')::numeric, NULL)
      ),
      CASE 
        WHEN NEW.step_count IS NOT NULL THEN 0.8
        ELSE 0.5
      END,
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for automatic processing
DROP TRIGGER IF EXISTS trigger_auto_process_health_data ON raw_health_data;
CREATE TRIGGER trigger_auto_process_health_data
  BEFORE INSERT ON raw_health_data
  FOR EACH ROW
  EXECUTE FUNCTION auto_process_raw_health_data();