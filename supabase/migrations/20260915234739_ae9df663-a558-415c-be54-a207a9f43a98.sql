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
         'health.' || CASE
           WHEN h.activity_type IN ('steps','walkingSpeed','stepLength','doubleSupport','walkingAsymmetry','walkingSteadiness','distance') THEN 'movement'
           WHEN h.activity_type IN ('calories','basalEnergy','activeEnergy') THEN 'energy'
           WHEN h.activity_type IN ('heartRate','hrv','restingHeartRate','bloodOxygen','respiratoryRate','bloodPressure','vo2max') THEN 'cardiac'
           WHEN h.activity_type IN ('noiseLevel','uvExposure','bodyTemperature') THEN 'environment'
           WHEN h.activity_type IN ('sleep','sleepAnalysis') THEN 'sleep'
           ELSE COALESCE(NULLIF(h.activity_type, ''), NULLIF(h.faculty, ''), 'general')
         END AS cat,
         COUNT(*)::bigint AS total,
         COUNT(DISTINCT COALESCE(h.pseudo_user_id::text, h.user_id::text))::bigint AS contributors,
         COALESCE(AVG(h.data_quality_score), 0)::numeric AS quality,
         MAX(h.created_at) AS latest
  FROM w JOIN public.staged_health_data h ON h.created_at >= w.window_start
  GROUP BY 1, 2, 3
),
h_mix_raw AS (
  SELECT w.window_key,
         'health.' || CASE
           WHEN h.activity_type IN ('steps','walkingSpeed','stepLength','doubleSupport','walkingAsymmetry','walkingSteadiness','distance') THEN 'movement'
           WHEN h.activity_type IN ('calories','basalEnergy','activeEnergy') THEN 'energy'
           WHEN h.activity_type IN ('heartRate','hrv','restingHeartRate','bloodOxygen','respiratoryRate','bloodPressure','vo2max') THEN 'cardiac'
           WHEN h.activity_type IN ('noiseLevel','uvExposure','bodyTemperature') THEN 'environment'
           WHEN h.activity_type IN ('sleep','sleepAnalysis') THEN 'sleep'
           ELSE COALESCE(NULLIF(h.activity_type, ''), NULLIF(h.faculty, ''), 'general')
         END AS cat,
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