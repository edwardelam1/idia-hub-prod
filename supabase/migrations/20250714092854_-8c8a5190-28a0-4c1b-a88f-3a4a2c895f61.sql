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