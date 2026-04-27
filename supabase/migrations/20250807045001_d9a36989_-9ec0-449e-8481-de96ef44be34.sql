-- Reset all stuck processing records and restart the pipeline
UPDATE raw_health_data 
SET processing_status = 'pending',
    processing_started_at = NULL,
    processing_completed_at = NULL,
    processed = FALSE,
    retry_count = 0,
    last_error = NULL
WHERE processing_status = 'processing';

-- Process pending records by directly inserting into health_metrics and staging data
WITH processed_data AS (
  SELECT 
    id,
    user_id,
    device_type,
    step_count,
    raw_payload,
    recorded_at,
    created_at
  FROM raw_health_data 
  WHERE processing_status = 'pending' 
  ORDER BY created_at ASC 
  LIMIT 20
)
INSERT INTO health_metrics (
  user_id,
  device_type, 
  activity_type,
  step_count,
  heart_rate,
  distance_meters,
  duration_seconds,
  calories_burned,
  recorded_at,
  raw_data
)
SELECT 
  user_id,
  COALESCE(device_type, 'Unknown'),
  'health_tracking',
  step_count,
  COALESCE((raw_payload->>'heart_rate')::integer, NULL),
  COALESCE((raw_payload->>'distance')::numeric, NULL),
  COALESCE((raw_payload->>'duration')::integer, NULL),
  COALESCE((raw_payload->>'calories')::integer, NULL),
  recorded_at,
  raw_payload
FROM processed_data;

-- Mark these records as completed
UPDATE raw_health_data 
SET processing_status = 'completed',
    processing_completed_at = NOW(),
    processed = TRUE
WHERE id IN (
  SELECT id FROM raw_health_data 
  WHERE processing_status = 'pending' 
  ORDER BY created_at ASC 
  LIMIT 20
);

-- Create staged health data for marketplace bundles
INSERT INTO staged_health_data (
  pseudo_user_id,
  device_type,
  activity_type,
  steps_count,
  average_heartrate,
  distance_meters,
  duration_seconds,
  calories_burned,
  data_quality_score,
  data_completeness_score,
  processed_at
)
SELECT 
  generate_pseudonym(user_id::text),
  COALESCE(device_type, 'Unknown'),
  'health_tracking',
  step_count,
  COALESCE((raw_payload->>'heart_rate')::integer, NULL),
  COALESCE((raw_payload->>'distance')::numeric, NULL),
  COALESCE((raw_payload->>'duration')::integer, NULL),
  COALESCE((raw_payload->>'calories')::integer, NULL),
  calculate_data_quality_score(
    COALESCE((raw_payload->>'heart_rate')::integer, NULL),
    NULL,
    COALESCE((raw_payload->>'duration')::integer, NULL),
    COALESCE((raw_payload->>'distance')::numeric, NULL)
  ),
  CASE 
    WHEN step_count IS NOT NULL THEN 0.8
    ELSE 0.5
  END,
  NOW()
FROM raw_health_data 
WHERE processing_status = 'completed' 
  AND id NOT IN (
    SELECT DISTINCT h.id 
    FROM raw_health_data h
    JOIN staged_health_data s ON generate_pseudonym(h.user_id::text) = s.pseudo_user_id
    WHERE h.recorded_at = s.processed_at
  )
LIMIT 20;