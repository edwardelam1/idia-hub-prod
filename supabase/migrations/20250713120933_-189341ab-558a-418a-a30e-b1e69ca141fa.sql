-- Fix health data pipeline and migrate existing processed data

-- Step 1: Clean up invalid data (NULL step counts)
DELETE FROM raw_health_data 
WHERE step_count IS NULL OR step_count <= 0;

-- Step 2: Clear the processing queue backlog
DELETE FROM data_processing_queue 
WHERE processing_status = 'pending' AND data_source_type = 'health_data';

-- Step 3: Migrate processed raw_health_data to health_metrics
INSERT INTO health_metrics (user_id, step_count, recorded_at, created_at)
SELECT 
  user_id,
  step_count,
  recorded_at,
  created_at
FROM raw_health_data 
WHERE processed = true 
  AND step_count IS NOT NULL 
  AND step_count > 0
  AND NOT EXISTS (
    SELECT 1 FROM health_metrics hm 
    WHERE hm.user_id = raw_health_data.user_id 
      AND hm.recorded_at = raw_health_data.recorded_at
      AND hm.step_count = raw_health_data.step_count
  );

-- Step 4: Process remaining unprocessed valid data
INSERT INTO health_metrics (user_id, step_count, recorded_at, created_at)
SELECT 
  user_id,
  step_count,
  recorded_at,
  NOW()
FROM raw_health_data 
WHERE processed = false 
  AND step_count IS NOT NULL 
  AND step_count > 0
  AND NOT EXISTS (
    SELECT 1 FROM health_metrics hm 
    WHERE hm.user_id = raw_health_data.user_id 
      AND hm.recorded_at = raw_health_data.recorded_at
      AND hm.step_count = raw_health_data.step_count
  );

-- Step 5: Mark all valid raw_health_data as processed
UPDATE raw_health_data 
SET processed = true, processing_completed_at = NOW()
WHERE step_count IS NOT NULL AND step_count > 0 AND processed = false;