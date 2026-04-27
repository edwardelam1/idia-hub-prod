-- Phase 1: Clean up duplicate health_metrics records
-- Keep only the earliest record for each unique combination of (user_id, step_count, recorded_at)

-- First, identify and delete duplicates, keeping only the earliest record
WITH duplicates AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY COALESCE(user_id::text, 'null'), 
                       COALESCE(step_count, -1), 
                       COALESCE(recorded_at, '1970-01-01'::timestamp)
           ORDER BY created_at ASC
         ) as rn
  FROM health_metrics
  WHERE step_count IS NOT NULL
)
DELETE FROM health_metrics 
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Phase 2: Remove the circular trigger that causes duplicates
DROP TRIGGER IF EXISTS sync_to_raw_data_trigger ON health_metrics;
DROP FUNCTION IF EXISTS sync_health_metrics_to_raw_data();

-- Phase 3: Add deduplication function for raw_health_data
CREATE OR REPLACE FUNCTION check_raw_health_data_duplicate(
  p_step_count INTEGER,
  p_recorded_at TIMESTAMP WITH TIME ZONE,
  p_user_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  -- Check if a similar record already exists within 1 minute window
  RETURN EXISTS (
    SELECT 1 FROM raw_health_data 
    WHERE step_count = p_step_count 
    AND user_id = p_user_id
    AND ABS(EXTRACT(EPOCH FROM (recorded_at - p_recorded_at))) < 60
  );
END;
$$ LANGUAGE plpgsql;

-- Update the queue processing function to avoid duplicates
CREATE OR REPLACE FUNCTION queue_raw_health_data_for_processing()
RETURNS TRIGGER AS $$
BEGIN
  -- Only queue if not already processed and not a duplicate
  IF NEW.processed = false THEN
    -- Check for recent duplicates before queuing
    IF NOT check_raw_health_data_duplicate(NEW.step_count, NEW.recorded_at, NEW.user_id) OR 
       NOT EXISTS (SELECT 1 FROM data_processing_queue WHERE raw_data_id = NEW.id) THEN
      INSERT INTO data_processing_queue (
        raw_data_id,
        processing_status,
        processing_stage,
        data_source_type,
        created_at
      ) VALUES (
        NEW.id,
        'pending',
        'anonymization',
        'health_data',
        NOW()
      ) ON CONFLICT (raw_data_id) DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure the trigger is properly set up
DROP TRIGGER IF EXISTS queue_for_processing_trigger ON raw_health_data;
CREATE TRIGGER queue_for_processing_trigger
  AFTER INSERT ON raw_health_data
  FOR EACH ROW
  EXECUTE FUNCTION queue_raw_health_data_for_processing();