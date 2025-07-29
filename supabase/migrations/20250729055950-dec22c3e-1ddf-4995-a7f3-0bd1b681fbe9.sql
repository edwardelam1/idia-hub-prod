-- Process all unprocessed raw health data by setting processed = true
UPDATE raw_health_data 
SET processed = true, 
    updated_at = now()
WHERE processed = false;