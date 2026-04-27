-- First, deactivate duplicate bundles, keeping only the most recent of each group
UPDATE marketplace_bundles 
SET is_active = false, updated_at = now()
WHERE bundle_id IN (
  SELECT bundle_id FROM (
    SELECT bundle_id,
           ROW_NUMBER() OVER (PARTITION BY title, category ORDER BY created_at DESC) as rn
    FROM marketplace_bundles 
    WHERE is_active = true 
      AND title IN (
        'Urban Wellness Dynamics: Aggregated Activity & Health Trends',
        'Athletic Performance & Activity Analytics', 
        'Regional Health & Wellness Trends Analysis'
      )
  ) ranked 
  WHERE rn > 1  -- Deactivate all but the most recent
);

-- Now add the unique constraint to prevent future duplicates
CREATE UNIQUE INDEX unique_active_bundle_title_category 
ON marketplace_bundles (title, category) 
WHERE is_active = true;