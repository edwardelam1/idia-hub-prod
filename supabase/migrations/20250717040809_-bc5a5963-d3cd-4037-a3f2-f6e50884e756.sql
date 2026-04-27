-- Fix the processing stage constraint issue and continue comprehensive processing

-- Force reprocess recent health data to extract comprehensive HealthKit data points
UPDATE raw_health_data 
SET 
  processing_status = 'pending',
  processing_started_at = NULL,
  processing_completed_at = NULL,
  processed = false
WHERE created_at > NOW() - INTERVAL '48 hours'
  AND raw_payload IS NOT NULL;

-- Clear recent queue items to rebuild with valid processing stages
DELETE FROM data_processing_queue 
WHERE created_at > NOW() - INTERVAL '48 hours';

-- Insert recent health data into processing queue using valid processing stage
INSERT INTO data_processing_queue (
  raw_data_id,
  processing_status,
  processing_stage,
  data_source_type,
  created_at
)
SELECT 
  id,
  'pending',
  'anonymization', -- Use valid processing stage
  'health_data',
  NOW()
FROM raw_health_data 
WHERE processing_status = 'pending' 
  AND processed = false
  AND created_at > NOW() - INTERVAL '48 hours'
  AND raw_payload IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM data_processing_queue 
    WHERE raw_data_id = raw_health_data.id
  )
LIMIT 50;

-- Trigger comprehensive health data processing
SELECT net.http_post(
  'https://zxyngqciipcvveigrzqt.supabase.co/functions/v1/process-health-streams',
  '{"trigger": "comprehensive_processing"}'::jsonb,
  '5000'::integer,
  '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4eW5ncWNpaXBjdnZlaWdyenF0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTMyMjA3NiwiZXhwIjoyMDY2ODk4MDc2fQ.G0Nj4rG9N6N2MKlf9xYyPRXA9WJQx8ZhxqCMM-tpMWY"}'::jsonb
) as processing_result;