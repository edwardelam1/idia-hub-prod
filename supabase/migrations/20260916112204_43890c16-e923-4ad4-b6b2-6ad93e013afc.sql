
CREATE OR REPLACE FUNCTION public.staged_aca_hashes()
RETURNS TABLE(aca_hash_key text, vault text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT s.aca_hash_key, 'staged_health_data'::text
  FROM public.staged_health_data s WHERE s.aca_hash_key IS NOT NULL
  UNION
  SELECT DISTINCT s.aca_hash_key, 'staged_lifestyle_data'::text
  FROM public.staged_lifestyle_data s WHERE s.aca_hash_key IS NOT NULL
  UNION
  SELECT DISTINCT s.aca_hash_key, 'staged_ford_data'::text
  FROM public.staged_ford_data s WHERE s.aca_hash_key IS NOT NULL
$$;

GRANT EXECUTE ON FUNCTION public.staged_aca_hashes() TO service_role, authenticated;

CREATE OR REPLACE FUNCTION public.staged_marketplace_aggregates()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'health', (
      SELECT jsonb_build_object(
        'scope', 'ecosystem',
        'count', count(*),
        'totals', jsonb_build_object(
          'steps', COALESCE(sum(steps_count), 0),
          'duration_seconds', COALESCE(sum(duration_seconds), 0),
          'active_energy_kcal', COALESCE(sum(active_energy_kcal), 0),
          'basal_energy_kcal', COALESCE(sum(basal_energy_kcal), 0),
          'avg_quality', round(avg(data_quality_score)::numeric, 4),
          'avg_heart_rate', round(avg(heart_rate)::numeric, 2),
          'avg_resting_hr', round(avg(resting_heart_rate)::numeric, 2),
          'max_heart_rate', max(heart_rate),
          'min_heart_rate', min(heart_rate),
          'avg_blood_oxygen', round(avg(blood_oxygen_percentage)::numeric, 2),
          'avg_vo2_max', round(avg(vo2_max)::numeric, 2),
          'contributors', count(DISTINCT aca_hash_key)
        ),
        'range', jsonb_build_object(
          'min_processed_at', min(processed_at),
          'max_processed_at', max(processed_at)
        )
      ) FROM public.staged_health_data
    ),
    'lifestyle', (
      SELECT jsonb_build_object(
        'scope', 'ecosystem',
        'count', count(*),
        'totals', jsonb_build_object(
          'session_duration', COALESCE(sum(session_duration), 0),
          'avg_quality', round(avg(data_quality_score)::numeric, 4),
          'event_types', count(DISTINCT event_type),
          'event_categories', count(DISTINCT event_category),
          'contributors', count(DISTINCT aca_hash_key)
        ),
        'range', jsonb_build_object(
          'min_processed_at', min(processed_at),
          'max_processed_at', max(processed_at)
        )
      ) FROM public.staged_lifestyle_data
    ),
    'ford', (
      SELECT jsonb_build_object(
        'scope', 'ecosystem',
        'count', count(*),
        'totals', jsonb_build_object(
          'metric_types', count(DISTINCT metric_type),
          'vehicles', count(DISTINCT vehicle_id),
          'avg_metric_value', round(avg(metric_value)::numeric, 4),
          'sum_metric_value', COALESCE(sum(metric_value), 0),
          'max_odometer', max(odometer),
          'contributors', count(DISTINCT aca_hash_key)
        ),
        'range', jsonb_build_object(
          'min_processed_at', min(processed_at),
          'max_processed_at', max(processed_at),
          'min_recorded_at', min(recorded_at),
          'max_recorded_at', max(recorded_at)
        )
      ) FROM public.staged_ford_data
    )
  )
$$;

GRANT EXECUTE ON FUNCTION public.staged_marketplace_aggregates() TO service_role, authenticated;

CREATE OR REPLACE FUNCTION public.staged_user_aggregates(_pseudo_id text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'health', (
      SELECT jsonb_build_object(
        'scope', 'personal',
        'count', count(*),
        'totals', jsonb_build_object(
          'steps', COALESCE(sum(steps_count), 0),
          'duration_seconds', COALESCE(sum(duration_seconds), 0),
          'active_energy_kcal', COALESCE(sum(active_energy_kcal), 0),
          'basal_energy_kcal', COALESCE(sum(basal_energy_kcal), 0),
          'avg_quality', round(avg(data_quality_score)::numeric, 4),
          'avg_heart_rate', round(avg(heart_rate)::numeric, 2),
          'avg_resting_hr', round(avg(resting_heart_rate)::numeric, 2),
          'max_heart_rate', max(heart_rate),
          'min_heart_rate', min(heart_rate),
          'avg_blood_oxygen', round(avg(blood_oxygen_percentage)::numeric, 2),
          'avg_vo2_max', round(avg(vo2_max)::numeric, 2)
        ),
        'range', jsonb_build_object(
          'min_processed_at', min(processed_at),
          'max_processed_at', max(processed_at)
        )
      )
      FROM public.staged_health_data h
      WHERE h.user_id::text = _pseudo_id
         OR h.entity_id::text = _pseudo_id
         OR h.pseudo_user_id::text = _pseudo_id
    ),
    'lifestyle', (
      SELECT jsonb_build_object(
        'scope', 'personal',
        'count', count(*),
        'totals', jsonb_build_object(
          'session_duration', COALESCE(sum(session_duration), 0),
          'avg_quality', round(avg(data_quality_score)::numeric, 4),
          'event_types', count(DISTINCT event_type),
          'event_categories', count(DISTINCT event_category)
        ),
        'range', jsonb_build_object(
          'min_processed_at', min(processed_at),
          'max_processed_at', max(processed_at)
        )
      )
      FROM public.staged_lifestyle_data l
      WHERE l.user_id::text = _pseudo_id
         OR l.entity_id::text = _pseudo_id
         OR l.pseudo_user_id::text = _pseudo_id
    ),
    'ford', (
      SELECT jsonb_build_object(
        'scope', 'ecosystem',
        'count', count(*),
        'totals', jsonb_build_object(
          'metric_types', count(DISTINCT metric_type),
          'vehicles', count(DISTINCT vehicle_id),
          'avg_metric_value', round(avg(metric_value)::numeric, 4),
          'sum_metric_value', COALESCE(sum(metric_value), 0)
        ),
        'range', jsonb_build_object(
          'min_processed_at', min(processed_at),
          'max_processed_at', max(processed_at)
        )
      ) FROM public.staged_ford_data
    )
  )
$$;

GRANT EXECUTE ON FUNCTION public.staged_user_aggregates(text) TO service_role, authenticated;
