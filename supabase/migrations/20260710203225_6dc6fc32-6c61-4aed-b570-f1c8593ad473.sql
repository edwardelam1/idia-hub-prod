CREATE OR REPLACE FUNCTION public.get_omni_aggregates(pseudo_id text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid;
  health_json jsonb;
  lifestyle_json jsonb;
BEGIN
  BEGIN
    uid := pseudo_id::uuid;
  EXCEPTION WHEN others THEN
    uid := NULL;
  END;

  SELECT jsonb_build_object(
    'count', COUNT(*),
    'totals', jsonb_build_object(
      'steps', COALESCE(SUM(steps_count), 0),
      'duration_seconds', COALESCE(SUM(duration_seconds), 0),
      'active_energy_kcal', COALESCE(SUM(active_energy_kcal), 0),
      'basal_energy_kcal', COALESCE(SUM(basal_energy_kcal), 0),
      'avg_quality', ROUND(AVG(data_quality_score)::numeric, 4),
      'avg_heart_rate', ROUND(AVG(heart_rate)::numeric, 2),
      'avg_resting_hr', ROUND(AVG(resting_heart_rate)::numeric, 2),
      'max_heart_rate', MAX(heart_rate),
      'min_heart_rate', MIN(heart_rate),
      'avg_blood_oxygen', ROUND(AVG(blood_oxygen_percentage)::numeric, 2),
      'avg_vo2_max', ROUND(AVG(vo2_max)::numeric, 2)
    ),
    'range', jsonb_build_object(
      'min_processed_at', MIN(processed_at),
      'max_processed_at', MAX(processed_at)
    )
  )
  INTO health_json
  FROM public.staged_health_data
  WHERE (uid IS NOT NULL AND (user_id = uid OR entity_id = uid))
     OR pseudo_user_id = pseudo_id;

  SELECT jsonb_build_object(
    'count', COUNT(*),
    'totals', jsonb_build_object(
      'session_duration', COALESCE(SUM(session_duration), 0),
      'avg_quality', ROUND(AVG(data_quality_score)::numeric, 4),
      'event_types', COUNT(DISTINCT event_type),
      'event_categories', COUNT(DISTINCT event_category)
    ),
    'range', jsonb_build_object(
      'min_processed_at', MIN(processed_at),
      'max_processed_at', MAX(processed_at)
    )
  )
  INTO lifestyle_json
  FROM public.staged_lifestyle_data
  WHERE (uid IS NOT NULL AND (user_id = uid OR entity_id = uid OR pseudo_user_id = uid));

  RETURN jsonb_build_object('health', health_json, 'lifestyle', lifestyle_json);
END;
$$;

REVOKE ALL ON FUNCTION public.get_omni_aggregates(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_omni_aggregates(text) TO service_role;
