-- Force process all pending raw health data by updating status to trigger processing
UPDATE raw_health_data 
SET processing_status = 'pending',
    processing_started_at = NULL,
    processing_completed_at = NULL,
    processed = FALSE,
    retry_count = 0,
    last_error = NULL,
    next_retry_at = NULL
WHERE processing_status = 'pending';

-- Call the fix-health-pipeline function to process the stuck data
SELECT net.http_post(
  'https://zxyngqciipcvveigrzqt.supabase.co/functions/v1/fix-health-pipeline'::text,
  '{"trigger": "manual_fix", "force_process": true}'::jsonb,
  '{}'::jsonb,
  '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4eW5ncWNpaXBjdnZlaWdyenF0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTMyMjA3NiwiZXhwIjoyMDY2ODk4MDc2fQ.G0Nj4rG9N6N2MKlf9xYyPRXA9WJQx8ZhxqCMM-tpMWY"}'::jsonb,
  5000
) as fix_result;

-- Call the process-health-streams function to process the data through the pipeline
SELECT net.http_post(
  'https://zxyngqciipcvveigrzqt.supabase.co/functions/v1/process-health-streams'::text,
  '{"trigger": "manual_processing"}'::jsonb,
  '{}'::jsonb,
  '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4eW5ncWNpaXBjdnZlaWdyenF0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTMyMjA3NiwiZXhwIjoyMDY2ODk4MDc2fQ.G0Nj4rG9N6N2MKlf9xYyPRXA9WJQx8ZhxqCMM-tpMWY"}'::jsonb,
  5000
) as stream_result;

-- Trigger bundle generation
SELECT net.http_post(
  'https://zxyngqciipcvveigrzqt.supabase.co/functions/v1/trigger-comprehensive-bundle-generation'::text,
  '{"trigger": "manual_bundle_generation"}'::jsonb,
  '{}'::jsonb,
  '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4eW5ncWNpaXBjdnZlaWdyenF0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTMyMjA3NiwiZXhwIjoyMDY2ODk4MDc2fQ.G0Nj4rG9N6N2MKlf9xYyPRXA9WJQx8ZhxqCMM-tpMWY"}'::jsonb,
  5000
) as bundle_result;