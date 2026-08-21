CREATE OR REPLACE FUNCTION public.get_staging_aggregates()
RETURNS TABLE(
  source text,
  category text,
  total_records bigint,
  distinct_contributors bigint,
  avg_quality numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

GRANT EXECUTE ON FUNCTION public.get_staging_aggregates() TO service_role;

WITH ranked AS (
  SELECT bundle_id,
         ROW_NUMBER() OVER (PARTITION BY category, tier ORDER BY created_at DESC) AS rn
  FROM public.marketplace_bundles
  WHERE is_active = true
)
UPDATE public.marketplace_bundles mb
SET is_active = false, updated_at = now()
FROM ranked r
WHERE mb.bundle_id = r.bundle_id AND r.rn > 1;