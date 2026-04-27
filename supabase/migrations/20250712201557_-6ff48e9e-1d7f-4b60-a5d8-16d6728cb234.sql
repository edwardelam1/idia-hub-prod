-- Update the trigger function to include data source type
CREATE OR REPLACE FUNCTION queue_raw_health_data_for_processing()
RETURNS TRIGGER AS $$
BEGIN
  -- Only queue if not already processed
  IF NEW.processed = false THEN
    INSERT INTO data_processing_queue (
      raw_data_id,
      processing_status,
      processing_stage,
      data_source_type,
      created_at
    ) VALUES (
      NEW.id,
      'pending',
      'anonymization',
      'health_data',
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;