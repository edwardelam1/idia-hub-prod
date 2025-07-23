-- Update marketplace bundle pricing to be more realistic and variable based on data volume
UPDATE marketplace_bundles 
SET price = CASE 
  WHEN tier = 'Enterprise' THEN 
    GREATEST(500, LEAST(2500, contacts_count * 1.8 + 200))
  WHEN tier = 'Professional' THEN 
    GREATEST(300, LEAST(1800, contacts_count * 1.2 + 150))
  ELSE 
    GREATEST(150, LEAST(1200, contacts_count * 0.8 + 100))
END
WHERE is_active = true;