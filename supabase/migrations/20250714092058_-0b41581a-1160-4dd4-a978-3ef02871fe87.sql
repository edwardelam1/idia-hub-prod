-- Linear Pipeline Consolidation Migration
-- Phase 1: Remove circular triggers and clean up duplicate pipeline

-- Step 1: Remove circular triggers that cause duplicate data
DROP TRIGGER IF EXISTS sync_to_raw_data_trigger ON health_metrics;
DROP TRIGGER IF EXISTS trigger_idia_synapse_orchestration_trigger ON raw_health_data;

-- Step 2: Clean up duplicate records in raw_health_data, keeping only the earliest
WITH duplicates AS (
  SELECT id, 
         ROW_NUMBER() OVER (
           PARTITION BY step_count, recorded_at, user_id 
           ORDER BY created_at ASC
         ) as rn
  FROM raw_health_data
  WHERE step_count IS NOT NULL
)
DELETE FROM raw_health_data 
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Step 3: Drop the health_metrics table since we're consolidating to raw_health_data only
DROP TABLE IF EXISTS health_metrics CASCADE;

-- Step 4: Improve the deduplication function to be more robust
CREATE OR REPLACE FUNCTION check_raw_health_data_duplicate(
  p_step_count integer, 
  p_recorded_at timestamp with time zone, 
  p_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Check if a similar record already exists within 5 minute window
  -- More restrictive to prevent duplicates
  RETURN EXISTS (
    SELECT 1 FROM raw_health_data 
    WHERE step_count = p_step_count 
    AND user_id = p_user_id
    AND ABS(EXTRACT(EPOCH FROM (recorded_at - p_recorded_at))) < 300
  );
END;
$function$

-- Step 5: Update the queue trigger to be more robust against duplicates
CREATE OR REPLACE FUNCTION queue_raw_health_data_for_processing()
RETURNS TRIGGER AS $$
BEGIN
  -- Only queue if not already processed and not a duplicate
  IF NEW.processed = false THEN
    -- Enhanced duplicate check before queuing
    IF NOT check_raw_health_data_duplicate(NEW.step_count, NEW.recorded_at, NEW.user_id) THEN
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

-- Step 6: Recreate the queue trigger (only this one, no circular triggers)
DROP TRIGGER IF EXISTS queue_for_processing_trigger ON raw_health_data;
CREATE TRIGGER queue_for_processing_trigger
  AFTER INSERT ON raw_health_data
  FOR EACH ROW
  EXECUTE FUNCTION queue_raw_health_data_for_processing();

-- Step 7: Add index for better dashboard performance
CREATE INDEX IF NOT EXISTS idx_raw_health_data_dashboard 
ON raw_health_data (created_at DESC, step_count) 
WHERE step_count IS NOT NULL AND step_count > 0;

-- Step 8: Add unique constraint to prevent future duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_raw_health_data_unique_record
ON raw_health_data (step_count, recorded_at, user_id)
WHERE step_count IS NOT NULL AND recorded_at IS NOT NULL AND user_id IS NOT NULL;