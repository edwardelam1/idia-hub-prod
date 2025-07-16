-- First, disable the problematic triggers to prevent infinite recursion
DROP TRIGGER IF EXISTS trigger_idia_synapse_on_raw_health_data ON public.raw_health_data;

-- Phase 1: Fix Processing Status Issues
-- Reset stuck records that are marked as processed but still pending
UPDATE raw_health_data 
SET 
  processing_status = 'pending',
  processing_started_at = NULL,
  processing_completed_at = NULL,
  processed = false,
  retry_count = 0,
  last_error = NULL,
  next_retry_at = NULL
WHERE (processed = true AND processing_status != 'completed')
   OR (processing_status = 'pending' AND processed = true)
   OR (processing_started_at IS NOT NULL AND processing_completed_at IS NULL AND processing_started_at < NOW() - INTERVAL '10 minutes');

-- Phase 2: Restart Data Extraction Pipeline
-- Force reprocessing of recent data with null step counts
UPDATE raw_health_data 
SET 
  processing_status = 'pending',
  processing_started_at = NULL,
  processed = false
WHERE step_count IS NULL 
  AND created_at > NOW() - INTERVAL '7 days'
  AND raw_payload IS NOT NULL;

-- Phase 3: Rebuild Processing Queue System
-- Clear any stuck queue items and rebuild from pending raw data
DELETE FROM data_processing_queue 
WHERE processing_status IN ('processing', 'failed')
   OR created_at < NOW() - INTERVAL '1 hour';

-- Insert pending raw health data into processing queue
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
  AND NOT EXISTS (
    SELECT 1 FROM data_processing_queue 
    WHERE raw_data_id = raw_health_data.id
  )
LIMIT 100;