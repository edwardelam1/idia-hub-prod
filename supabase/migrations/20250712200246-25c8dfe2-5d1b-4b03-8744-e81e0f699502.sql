-- Create a trigger to automatically process health_metrics data through the new pipeline
-- This ensures legacy data flows through the new processing system

-- First, create a function to sync health_metrics to raw_health_data
CREATE OR REPLACE FUNCTION sync_health_metrics_to_raw_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into raw_health_data when new health_metrics are added
  INSERT INTO raw_health_data (
    raw_payload,
    device_type,
    step_count,
    recorded_at,
    user_id,
    processed
  ) VALUES (
    jsonb_build_object(
      'step_count', NEW.step_count,
      'recorded_at', NEW.recorded_at,
      'source', 'health_metrics_sync',
      'original_id', NEW.id
    ),
    'mobile_app',
    NEW.step_count,
    NEW.recorded_at,
    NEW.user_id,
    false
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger on health_metrics
DROP TRIGGER IF EXISTS sync_to_raw_data_trigger ON health_metrics;
CREATE TRIGGER sync_to_raw_data_trigger
  AFTER INSERT ON health_metrics
  FOR EACH ROW
  EXECUTE FUNCTION sync_health_metrics_to_raw_data();

-- Create a function to auto-queue raw health data for processing
CREATE OR REPLACE FUNCTION queue_raw_health_data_for_processing()
RETURNS TRIGGER AS $$
BEGIN
  -- Only queue if not already processed
  IF NEW.processed = false THEN
    INSERT INTO data_processing_queue (
      raw_data_id,
      processing_status,
      processing_stage,
      created_at
    ) VALUES (
      NEW.id,
      'pending',
      'anonymization',
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger on raw_health_data
DROP TRIGGER IF EXISTS queue_for_processing_trigger ON raw_health_data;
CREATE TRIGGER queue_for_processing_trigger
  AFTER INSERT ON raw_health_data
  FOR EACH ROW
  EXECUTE FUNCTION queue_raw_health_data_for_processing();

-- Enable real-time updates for pipeline monitoring tables
ALTER TABLE health_metrics REPLICA IDENTITY FULL;
ALTER TABLE raw_health_data REPLICA IDENTITY FULL;
ALTER TABLE data_processing_queue REPLICA IDENTITY FULL;
ALTER TABLE staged_health_data REPLICA IDENTITY FULL;
ALTER TABLE marketplace_bundles REPLICA IDENTITY FULL;

-- Add tables to realtime publication (only if not already added)
DO $$
BEGIN
  -- Try to add each table, ignore if already exists
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE raw_health_data;
  EXCEPTION WHEN duplicate_object THEN
    -- Table already in publication
    NULL;
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE data_processing_queue;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE staged_health_data;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE marketplace_bundles;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;