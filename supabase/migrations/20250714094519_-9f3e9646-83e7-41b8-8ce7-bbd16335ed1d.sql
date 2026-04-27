-- Clean up orphaned queue items and add maintenance functions

-- Step 1: Remove orphaned queue items that reference deleted raw_health_data
DELETE FROM data_processing_queue 
WHERE raw_data_id IS NOT NULL 
  AND NOT EXISTS (
    SELECT 1 FROM raw_health_data 
    WHERE id = data_processing_queue.raw_data_id
  );

-- Step 2: Create a function to clean orphaned queue items automatically
CREATE OR REPLACE FUNCTION public.cleanup_orphaned_queue_items()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count integer;
BEGIN
  -- Delete orphaned queue items
  DELETE FROM data_processing_queue 
  WHERE raw_data_id IS NOT NULL 
    AND NOT EXISTS (
      SELECT 1 FROM raw_health_data 
      WHERE id = data_processing_queue.raw_data_id
    );
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log the cleanup action
  RAISE LOG 'Cleaned up % orphaned queue items', deleted_count;
  
  RETURN deleted_count;
END;
$$;

-- Step 3: Update the queue processing function to handle missing raw data gracefully
CREATE OR REPLACE FUNCTION public.queue_raw_health_data_for_processing()
RETURNS trigger
LANGUAGE plpgsql
AS $$
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
$$;

-- Step 4: Create the trigger for auto-queuing new raw health data
DROP TRIGGER IF EXISTS queue_for_processing_trigger ON raw_health_data;
CREATE TRIGGER queue_for_processing_trigger
  AFTER INSERT ON raw_health_data
  FOR EACH ROW
  EXECUTE FUNCTION queue_raw_health_data_for_processing();

-- Step 5: Add a periodic cleanup job (runs every hour)
SELECT cron.schedule(
  'cleanup-orphaned-queue-items',
  '0 * * * *', -- every hour at minute 0
  $$
  SELECT public.cleanup_orphaned_queue_items();
  $$
);