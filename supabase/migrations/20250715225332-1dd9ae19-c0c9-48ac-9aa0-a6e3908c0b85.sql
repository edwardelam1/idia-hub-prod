-- Delete bundle generation logs first to avoid foreign key constraint
DELETE FROM bundle_generation_logs WHERE bundle_id = '536bbf1f-46e5-46aa-9680-c1f7a82a1d92';

-- Then delete the stale bundle to force complete regeneration
DELETE FROM marketplace_bundles WHERE bundle_id = '536bbf1f-46e5-46aa-9680-c1f7a82a1d92';