-- Fix overly aggressive deduplication that's blocking legitimate Apple Health data
-- The current logic blocks records with same step_count within 5 minutes
-- But Apple Health often sends cumulative data, so we need more sophisticated deduplication

CREATE OR REPLACE FUNCTION public.check_raw_health_data_duplicate(
  p_step_count integer, 
  p_recorded_at timestamp with time zone, 
  p_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
AS $function$
BEGIN
  -- More sophisticated deduplication:
  -- Only consider it a duplicate if EXACT timestamp AND step count match
  -- This allows for legitimate cumulative updates from Apple Health
  RETURN EXISTS (
    SELECT 1 FROM raw_health_data 
    WHERE step_count = p_step_count 
    AND user_id = p_user_id
    AND ABS(EXTRACT(EPOCH FROM (recorded_at - p_recorded_at))) < 60  -- 1 minute window instead of 5
    AND recorded_at = p_recorded_at  -- Exact timestamp match required
  );
END;
$function$;