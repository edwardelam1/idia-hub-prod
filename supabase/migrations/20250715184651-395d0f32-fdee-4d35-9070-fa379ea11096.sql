-- Update existing bundles with calculated prices based on data count and tier
UPDATE marketplace_bundles 
SET price = CASE 
  WHEN tier = 'Enterprise' THEN 
    GREATEST(300, LEAST(8000, contacts_count * 85 * 1.6))
  WHEN tier = 'Professional' THEN 
    GREATEST(300, LEAST(8000, contacts_count * 75 * 1.3))
  ELSE 
    GREATEST(300, LEAST(8000, contacts_count * 65))
END
WHERE is_active = true;