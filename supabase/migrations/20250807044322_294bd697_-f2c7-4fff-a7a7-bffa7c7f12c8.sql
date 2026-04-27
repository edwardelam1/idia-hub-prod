-- Manually process the first batch of pending raw health data
-- Process records by updating them to trigger the processing pipeline

-- Process the first 10 pending records by calling the anonymize-and-stage-data function
DO $$
DECLARE
    rec RECORD;
    counter INTEGER := 0;
BEGIN
    FOR rec IN 
        SELECT id FROM raw_health_data 
        WHERE processing_status = 'pending' 
        ORDER BY created_at ASC 
        LIMIT 10
    LOOP
        counter := counter + 1;
        
        -- Mark as processing
        UPDATE raw_health_data 
        SET processing_status = 'processing', 
            processing_started_at = NOW() 
        WHERE id = rec.id;
        
        -- Call the anonymize function
        PERFORM net.http_post(
            'https://zxyngqciipcvveigrzqt.supabase.co/functions/v1/anonymize-and-stage-data'::text,
            json_build_object('raw_data_id', rec.id::text, 'trigger_source', 'manual_processing')::jsonb,
            '{}'::jsonb,
            '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4eW5ncWNpaXBjdnZlaWdyenF0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTMyMjA3NiwiZXhwIjoyMDY2ODk4MDc2fQ.G0Nj4rG9N6N2MKlf9xYyPRXA9WJQx8ZhxqCMM-tpMWY"}'::jsonb,
            5000
        );
        
        RAISE LOG 'Processing record % (% of 10)', rec.id, counter;
    END LOOP;
    
    RAISE LOG 'Initiated processing for % records', counter;
END $$;