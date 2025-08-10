-- Purge simulated/test data across health tables
BEGIN;

-- 1) Remove simulated raw health data
WITH deleted_raw AS (
  DELETE FROM public.raw_health_data
  WHERE device_type ILIKE '%Recovery Test%'
     OR COALESCE(raw_payload->>'source','') = 'pipeline_recovery'
     OR (raw_payload ? 'test_data' AND NULLIF(raw_payload->>'test_data','')::boolean IS TRUE)
  RETURNING 1
)
SELECT COUNT(*) AS raw_deleted FROM deleted_raw;

-- 2) Remove derived simulated metrics
WITH deleted_metrics AS (
  DELETE FROM public.health_metrics
  WHERE device_type ILIKE '%Recovery Test%'
     OR COALESCE(raw_data->>'source','') = 'pipeline_recovery'
     OR (raw_data ? 'test_data' AND NULLIF(raw_data->>'test_data','')::boolean IS TRUE)
  RETURNING 1
)
SELECT COUNT(*) AS metrics_deleted FROM deleted_metrics;

-- 3) Remove simulated staged health data (propagated from Recovery Test device type)
WITH deleted_staged AS (
  DELETE FROM public.staged_health_data
  WHERE device_type ILIKE '%Recovery Test%'
  RETURNING 1
)
SELECT COUNT(*) AS staged_deleted FROM deleted_staged;

COMMIT;