
-- 1. Retire duplicates: keep the richest listing per (category, window_key)
WITH ranked AS (
  SELECT bundle_id,
         ROW_NUMBER() OVER (
           PARTITION BY category, COALESCE(window_key, 'all')
           ORDER BY (COALESCE(length(description), 0)
                     + COALESCE(length(title), 0)
                     + COALESCE(array_length(key_insights, 1), 0) * 50
                     + COALESCE(array_length(features, 1), 0) * 25
                     + COALESCE(array_length(data_points, 1), 0) * 10) DESC,
                    updated_at DESC NULLS LAST,
                    created_at DESC
         ) AS rn
  FROM public.marketplace_bundles
  WHERE is_active
)
UPDATE public.marketplace_bundles mb
SET is_active = false, updated_at = now()
FROM ranked r
WHERE mb.bundle_id = r.bundle_id AND r.rn > 1;

-- 2. Re-price survivors purely from the data, and reset the size label
WITH priced AS (
  SELECT
    mb.bundle_id,
    GREATEST(1, ceil(
      GREATEST(1, ceil(COALESCE(NULLIF(mb.data_json->>'record_count', '')::numeric, 0) / 500.0))
      * ceil(
          CASE split_part(lower(mb.category), '.', 1)
            WHEN 'health' THEN 2.5
            WHEN 'lifestyle' THEN 2.5
            WHEN 'business' THEN 1.5
            WHEN 'secondary' THEN 1.2
            WHEN 'tertiary' THEN 1.5
            WHEN 'quaternary' THEN 2.0
            WHEN 'quinary' THEN 2.5
            ELSE 1.0
          END
        )
      * (0.75 + LEAST(1, GREATEST(0,
            COALESCE(NULLIF(mb.data_json->>'avg_quality_score', '')::numeric, 0.8)
        )) * 0.25)
    ))::int AS new_price,
    CASE
      WHEN COALESCE(NULLIF(mb.data_json->>'record_count', '')::numeric, 0) >= 1000 THEN 'Enterprise'
      WHEN COALESCE(NULLIF(mb.data_json->>'record_count', '')::numeric, 0) >= 250 THEN 'Professional'
      ELSE 'Analyst'
    END AS new_tier
  FROM public.marketplace_bundles mb
  WHERE mb.is_active
)
UPDATE public.marketplace_bundles mb
SET price = p.new_price,
    tier = p.new_tier,
    updated_at = now()
FROM priced p
WHERE mb.bundle_id = p.bundle_id;

-- 3. Never allow two active listings for the same dataset and window again
CREATE UNIQUE INDEX IF NOT EXISTS idx_marketplace_bundles_unique_active_window
  ON public.marketplace_bundles (category, COALESCE(window_key, 'all'))
  WHERE is_active;
