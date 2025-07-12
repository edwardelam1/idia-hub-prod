-- Fix foreign key constraint for data_processing_queue to support both health and strava data
-- Drop the existing foreign key constraint that only points to raw_strava_data
ALTER TABLE data_processing_queue DROP CONSTRAINT IF EXISTS data_processing_queue_raw_data_id_fkey;

-- We'll need to handle this more flexibly since we have both raw_health_data and raw_strava_data
-- For now, we'll remove the foreign key constraint and rely on application logic
-- In a future iteration, we could create a union table or use a more sophisticated approach

-- Add a column to track the data source type
ALTER TABLE data_processing_queue ADD COLUMN IF NOT EXISTS data_source_type TEXT DEFAULT 'health_data';

-- Update existing records to mark them as strava data if they were pointing to strava
UPDATE data_processing_queue SET data_source_type = 'strava_data' WHERE data_source_type IS NULL;