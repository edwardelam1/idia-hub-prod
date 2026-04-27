-- Complete the comprehensive HealthKit data processing setup

-- Reset recent health data for comprehensive reprocessing
UPDATE raw_health_data 
SET 
  processing_status = 'pending',
  processing_started_at = NULL,
  processing_completed_at = NULL,
  processed = false
WHERE created_at > NOW() - INTERVAL '48 hours'
  AND raw_payload IS NOT NULL;

-- Clear and rebuild processing queue
DELETE FROM data_processing_queue 
WHERE created_at > NOW() - INTERVAL '48 hours';

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
  'anonymization',
  'health_data',
  NOW()
FROM raw_health_data 
WHERE processing_status = 'pending' 
  AND processed = false
  AND created_at > NOW() - INTERVAL '48 hours'
  AND raw_payload IS NOT NULL
LIMIT 50;