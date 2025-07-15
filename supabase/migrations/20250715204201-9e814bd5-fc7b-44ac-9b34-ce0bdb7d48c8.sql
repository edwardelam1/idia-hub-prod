-- Phase 1: Unblock the Data Pipeline
-- Reset all stuck raw health data to allow reprocessing
UPDATE raw_health_data 
SET 
  processing_status = 'pending',
  processing_started_at = NULL,
  processing_completed_at = NULL,
  processed = false,
  retry_count = 0,
  last_error = NULL,
  next_retry_at = NULL
WHERE processing_status IN ('processing', 'failed') 
  OR (processed = false AND processing_started_at IS NOT NULL);

-- Clear stuck items from the processing queue
DELETE FROM data_processing_queue 
WHERE processing_status IN ('processing', 'failed')
  OR created_at < NOW() - INTERVAL '1 hour';

-- Force trigger the health pipeline processor for immediate processing
SELECT net.http_post(
  'https://zxyngqciipcvveigrzqt.supabase.co/functions/v1/fix-health-pipeline'::text,
  '{}'::jsonb,
  '{}'::jsonb,
  '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4eW5ncWNpaXBjdnZlaWdyenF0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTMyMjA3NiwiZXhwIjoyMDY2ODk4MDc2fQ.G0Nj4rG9N6N2MKlf9xYyPRXA9WJQx8ZhxqCMM-tpMWY"}'::jsonb,
  10000
) as pipeline_trigger_result;