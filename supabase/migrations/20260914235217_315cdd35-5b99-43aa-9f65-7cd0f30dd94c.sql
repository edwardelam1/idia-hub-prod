-- 1) Shared read access for Ford vehicle data
GRANT SELECT ON public.staged_ford_data TO authenticated;
GRANT ALL ON public.staged_ford_data TO service_role;

DROP POLICY IF EXISTS "Users can view their own staged ford data" ON public.staged_ford_data;
DROP POLICY IF EXISTS "Authenticated users can view all staged ford data" ON public.staged_ford_data;
CREATE POLICY "Authenticated users can view all staged ford data"
ON public.staged_ford_data
FOR SELECT
TO authenticated
USING (true);

-- 2) Ford in the flat staging aggregates
CREATE OR REPLACE FUNCTION public.get_staging_aggregates()
 RETURNS TABLE(source text, category text, total_records bigint, distinct_contributors bigint, avg_quality numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    'staged_health_data'::text AS source,
    'health.' || COALESCE(NULLIF(h.faculty, ''), NULLIF(h.activity_type, ''), 'general') AS category,
    COUNT(*)::bigint AS total_records,
    COUNT(DISTINCT COALESCE(h.pseudo_user_id::text, h.user_id::text))::bigint AS distinct_contributors,
    COALESCE(AVG(h.data_quality_score), 0)::numeric AS avg_quality
  FROM public.staged_health_data h
  GROUP BY 2

  UNION ALL

  SELECT
    'staged_lifestyle_data'::text,
    'lifestyle.' || COALESCE(NULLIF(l.event_category, ''), 'general'),
    COUNT(*)::bigint,
    COUNT(DISTINCT COALESCE(l.pseudo_user_id::text, l.user_id::text))::bigint,
    COALESCE(AVG(l.data_quality_score), 0)::numeric
  FROM public.staged_lifestyle_data l
  GROUP BY 2

  UNION ALL

  SELECT
    'staged_business_data'::text,
    'business.' || COALESCE(NULLIF(b.business_category, ''), 'general'),
    COUNT(*)::bigint,
    COUNT(DISTINCT b.pseudo_business_id::text)::bigint,
    COALESCE(AVG(b.data_quality_score), 0)::numeric
  FROM public.staged_business_data b
  GROUP BY 2

  UNION ALL

  SELECT
    'staged_ford_data'::text,
    'vehicle.' || COALESCE(NULLIF(f.metric_type, ''), 'general'),
    COUNT(*)::bigint,
    COUNT(DISTINCT COALESCE(f.aca_hash_key, f.user_id::text))::bigint,
    NULL::numeric
  FROM public.staged_ford_data f
  GROUP BY 2
$function$;

-- 3) Ford in the windowed staging aggregates (windows keyed off processed_at)
CREATE OR REPLACE FUNCTION public.get_staging_aggregates_windowed()
 RETURNS TABLE(source text, category text, window_key text, window_start timestamp with time zone, window_end timestamp with time zone, total_records bigint, distinct_contributors bigint, avg_quality numeric, source_latest_at timestamp with time zone, activity_mix jsonb)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
WITH w(window_key, window_start) AS (
  VALUES
    ('24h', now() - interval '24 hours'),
    ('7d',  now() - interval '7 days'),
    ('30d', now() - interval '30 days'),
    ('all', '-infinity'::timestamptz)
),
h_base AS (
  SELECT w.window_key,
         w.window_start,
         'health.' || COALESCE(NULLIF(h.faculty, ''), NULLIF(h.activity_type, ''), 'general') AS cat,
         COUNT(*)::bigint AS total,
         COUNT(DISTINCT COALESCE(h.pseudo_user_id::text, h.user_id::text))::bigint AS contributors,
         COALESCE(AVG(h.data_quality_score), 0)::numeric AS quality,
         MAX(h.created_at) AS latest
  FROM w JOIN public.staged_health_data h ON h.created_at >= w.window_start
  GROUP BY 1, 2, 3
),
h_mix_raw AS (
  SELECT w.window_key,
         'health.' || COALESCE(NULLIF(h.faculty, ''), NULLIF(h.activity_type, ''), 'general') AS cat,
         COALESCE(NULLIF(h.activity_type, ''), 'unknown') AS k,
         COUNT(*)::bigint AS c
  FROM w JOIN public.staged_health_data h ON h.created_at >= w.window_start
  GROUP BY 1, 2, 3
),
h_mix AS (
  SELECT window_key, cat, jsonb_object_agg(k, c) AS mix FROM h_mix_raw GROUP BY 1, 2
),
l_base AS (
  SELECT w.window_key,
         w.window_start,
         'lifestyle.' || COALESCE(NULLIF(l.event_category, ''), 'general') AS cat,
         COUNT(*)::bigint AS total,
         COUNT(DISTINCT COALESCE(l.pseudo_user_id::text, l.user_id::text))::bigint AS contributors,
         COALESCE(AVG(l.data_quality_score), 0)::numeric AS quality,
         MAX(l.created_at) AS latest
  FROM w JOIN public.staged_lifestyle_data l ON l.created_at >= w.window_start
  GROUP BY 1, 2, 3
),
l_mix_raw AS (
  SELECT w.window_key,
         'lifestyle.' || COALESCE(NULLIF(l.event_category, ''), 'general') AS cat,
         COALESCE(NULLIF(l.event_type, ''), 'unknown') AS k,
         COUNT(*)::bigint AS c
  FROM w JOIN public.staged_lifestyle_data l ON l.created_at >= w.window_start
  GROUP BY 1, 2, 3
),
l_mix AS (
  SELECT window_key, cat, jsonb_object_agg(k, c) AS mix FROM l_mix_raw GROUP BY 1, 2
),
b_base AS (
  SELECT w.window_key,
         w.window_start,
         'business.' || COALESCE(NULLIF(b.business_category, ''), 'general') AS cat,
         COUNT(*)::bigint AS total,
         COUNT(DISTINCT b.pseudo_business_id::text)::bigint AS contributors,
         COALESCE(AVG(b.data_quality_score), 0)::numeric AS quality,
         MAX(b.created_at) AS latest
  FROM w JOIN public.staged_business_data b ON b.created_at >= w.window_start
  GROUP BY 1, 2, 3
),
b_mix_raw AS (
  SELECT w.window_key,
         'business.' || COALESCE(NULLIF(b.business_category, ''), 'general') AS cat,
         COALESCE(NULLIF(b.business_category, ''), 'unknown') AS k,
         COUNT(*)::bigint AS c
  FROM w JOIN public.staged_business_data b ON b.created_at >= w.window_start
  GROUP BY 1, 2, 3
),
b_mix AS (
  SELECT window_key, cat, jsonb_object_agg(k, c) AS mix FROM b_mix_raw GROUP BY 1, 2
),
f_base AS (
  SELECT w.window_key,
         w.window_start,
         'vehicle.' || COALESCE(NULLIF(f.metric_type, ''), 'general') AS cat,
         COUNT(*)::bigint AS total,
         COUNT(DISTINCT COALESCE(f.aca_hash_key, f.user_id::text))::bigint AS contributors,
         NULL::numeric AS quality,
         MAX(f.processed_at) AS latest
  FROM w JOIN public.staged_ford_data f ON f.processed_at >= w.window_start
  GROUP BY 1, 2, 3
),
f_mix_raw AS (
  SELECT w.window_key,
         'vehicle.' || COALESCE(NULLIF(f.metric_type, ''), 'general') AS cat,
         COALESCE(NULLIF(f.vehicle_id, ''), 'unknown') AS k,
         COUNT(*)::bigint AS c
  FROM w JOIN public.staged_ford_data f ON f.processed_at >= w.window_start
  GROUP BY 1, 2, 3
),
f_mix AS (
  SELECT window_key, cat, jsonb_object_agg(k, c) AS mix FROM f_mix_raw GROUP BY 1, 2
)
SELECT 'staged_health_data'::text, hb.cat, hb.window_key,
       NULLIF(hb.window_start, '-infinity'::timestamptz), now(),
       hb.total, hb.contributors, hb.quality, hb.latest, COALESCE(hm.mix, '{}'::jsonb)
FROM h_base hb LEFT JOIN h_mix hm ON hm.window_key = hb.window_key AND hm.cat = hb.cat
UNION ALL
SELECT 'staged_lifestyle_data'::text, lb.cat, lb.window_key,
       NULLIF(lb.window_start, '-infinity'::timestamptz), now(),
       lb.total, lb.contributors, lb.quality, lb.latest, COALESCE(lm.mix, '{}'::jsonb)
FROM l_base lb LEFT JOIN l_mix lm ON lm.window_key = lb.window_key AND lm.cat = lb.cat
UNION ALL
SELECT 'staged_business_data'::text, bb.cat, bb.window_key,
       NULLIF(bb.window_start, '-infinity'::timestamptz), now(),
       bb.total, bb.contributors, bb.quality, bb.latest, COALESCE(bm.mix, '{}'::jsonb)
FROM b_base bb LEFT JOIN b_mix bm ON bm.window_key = bb.window_key AND bm.cat = bb.cat
UNION ALL
SELECT 'staged_ford_data'::text, fb.cat, fb.window_key,
       NULLIF(fb.window_start, '-infinity'::timestamptz), now(),
       fb.total, fb.contributors, fb.quality, fb.latest, COALESCE(fm.mix, '{}'::jsonb)
FROM f_base fb LEFT JOIN f_mix fm ON fm.window_key = fb.window_key AND fm.cat = fb.cat
$function$;

-- 4) Ford (ecosystem-wide) in the omni aggregates
CREATE OR REPLACE FUNCTION public.get_omni_aggregates(pseudo_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid;
  health_json jsonb;
  lifestyle_json jsonb;
  ford_json jsonb;
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

  -- Ford is an ecosystem-wide shared pool: never filtered by user.
  SELECT jsonb_build_object(
    'scope', 'ecosystem',
    'count', COUNT(*),
    'totals', jsonb_build_object(
      'metric_types', COUNT(DISTINCT metric_type),
      'vehicles', COUNT(DISTINCT vehicle_id),
      'contributors', COUNT(DISTINCT COALESCE(aca_hash_key, user_id::text)),
      'avg_metric_value', ROUND(AVG(metric_value)::numeric, 4)
    ),
    'range', jsonb_build_object(
      'min_recorded_at', MIN(recorded_at),
      'max_recorded_at', MAX(recorded_at),
      'min_processed_at', MIN(processed_at),
      'max_processed_at', MAX(processed_at)
    )
  )
  INTO ford_json
  FROM public.staged_ford_data;

  RETURN jsonb_build_object('health', health_json, 'lifestyle', lifestyle_json, 'ford', ford_json);
END;
$function$;