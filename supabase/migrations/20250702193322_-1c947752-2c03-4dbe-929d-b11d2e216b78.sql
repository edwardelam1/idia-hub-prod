-- Create function to automatically process health_metrics into staged_health_data
CREATE OR REPLACE FUNCTION public.process_health_metrics()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Convert health_metrics to staged_health_data format
  INSERT INTO public.staged_health_data (
    pseudo_user_id,
    activity_type,
    steps_count,
    processed_at,
    created_at,
    data_quality_score,
    workout_intensity,
    device_type,
    anonymized_location_zone
  ) VALUES (
    COALESCE(public.generate_pseudonym(NEW.user_id::text), 'anonymous_' || substring(md5(random()::text), 1, 8)),
    'Daily Activity',
    NEW.step_count,
    NOW(),
    NEW.created_at,
    CASE 
      WHEN NEW.step_count IS NOT NULL THEN 0.8
      ELSE 0.5
    END,
    CASE 
      WHEN NEW.step_count > 10000 THEN 75
      WHEN NEW.step_count > 5000 THEN 50
      ELSE 25
    END,
    'Health App',
    public.anonymize_location(
      40.7128 + (random() - 0.5) * 0.1, 
      -74.0060 + (random() - 0.5) * 0.1
    )
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger to automatically process health metrics
DROP TRIGGER IF EXISTS trigger_process_health_metrics ON public.health_metrics;
CREATE TRIGGER trigger_process_health_metrics
  AFTER INSERT ON public.health_metrics
  FOR EACH ROW
  EXECUTE FUNCTION public.process_health_metrics();

-- Create function for scheduled bundle generation
CREATE OR REPLACE FUNCTION public.trigger_bundle_generation()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Call the create-health-data-bundle edge function
  PERFORM net.http_post(
    url := 'https://zxyngqciipcvveigrzqt.supabase.co/functions/v1/create-health-data-bundle',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.supabase_service_role_key', true) || '"}'::jsonb,
    body := '{"trigger": "scheduled"}'::text
  );
END;
$$;

-- Enable pg_cron extension for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule bundle generation every hour
SELECT cron.schedule(
  'health-bundle-generation',
  '0 * * * *', -- Every hour
  'SELECT public.trigger_bundle_generation();'
);

-- Insert some sample health data to test the pipeline
INSERT INTO public.health_metrics (step_count, recorded_at) VALUES
(8500, NOW() - INTERVAL '1 hour'),
(12000, NOW() - INTERVAL '2 hours'),
(6500, NOW() - INTERVAL '3 hours'),
(15000, NOW() - INTERVAL '4 hours'),
(7200, NOW() - INTERVAL '5 hours');