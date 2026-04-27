-- Force reprocessing of all recent health data with the new comprehensive extraction logic
-- This will trigger the updated anonymization processor to handle all 37 HealthKit fields

UPDATE raw_health_data 
SET 
  processing_status = 'pending',
  processing_started_at = NULL,
  processing_completed_at = NULL,
  processed = false,
  retry_count = 0
WHERE created_at > NOW() - INTERVAL '7 days'
  AND raw_payload IS NOT NULL
  AND (raw_payload->>'source' = 'apple_health' OR raw_payload ? 'steps');

-- Clear old staged data to force fresh processing with comprehensive field extraction
DELETE FROM staged_health_data 
WHERE created_at > NOW() - INTERVAL '24 hours';

-- Clear bundle generation logs to trigger fresh bundle creation
DELETE FROM bundle_generation_logs 
WHERE created_at > NOW() - INTERVAL '24 hours';

-- Update marketplace bundles to inactive to force regeneration with comprehensive data
UPDATE marketplace_bundles 
SET is_active = false, updated_at = NOW()
WHERE updated_at < NOW() - INTERVAL '24 hours';