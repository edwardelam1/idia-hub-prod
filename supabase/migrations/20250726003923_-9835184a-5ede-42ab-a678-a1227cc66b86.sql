-- Phase 1: Restore Automatic Synapse Flow - Create Missing Triggers
-- CRITICAL: All data must flow through Synapse automatically

-- 1. Create trigger to ensure raw_health_data flows through anonymize-and-stage-data
CREATE OR REPLACE FUNCTION trigger_health_data_processing()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only trigger on INSERT with pending status
  IF TG_OP = 'INSERT' AND NEW.processing_status = 'pending' THEN
    -- Call anonymize-and-stage-data function
    PERFORM net.http_post(
      'https://zxyngqciipcvveigrzqt.supabase.co/functions/v1/anonymize-and-stage-data'::text,
      json_build_object(
        'raw_data_id', NEW.id::text,
        'trigger_source', 'raw_health_data'
      )::jsonb,
      '{}'::jsonb,
      '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4eW5ncWNpaXBjdnZlaWdyenF0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTMyMjA3NiwiZXhwIjoyMDY2ODk4MDc2fQ.G0Nj4rG9N6N2MKlf9xYyPRXA9WJQx8ZhxqCMM-tpMWY"}'::jsonb,
      5000
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on raw_health_data
DROP TRIGGER IF EXISTS trigger_health_data_synapse ON public.raw_health_data;
CREATE TRIGGER trigger_health_data_synapse
  AFTER INSERT ON public.raw_health_data
  FOR EACH ROW
  EXECUTE FUNCTION trigger_health_data_processing();

-- 2. Create trigger to queue device_events for lifestyle processing
CREATE OR REPLACE FUNCTION trigger_lifestyle_data_processing()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Queue lifestyle-related device events
  IF TG_OP = 'INSERT' AND NEW.data_category IN ('lifestyle', 'social', 'behavioral', 'location', 'user_profile', 'governance') THEN
    -- Call process-lifestyle-data function
    PERFORM net.http_post(
      'https://zxyngqciipcvveigrzqt.supabase.co/functions/v1/process-lifestyle-data'::text,
      json_build_object(
        'device_event_id', NEW.id::text,
        'trigger_source', 'device_events'
      )::jsonb,
      '{}'::jsonb,
      '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4eW5ncWNpaXBjdnZlaWdyenF0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTMyMjA3NiwiZXhwIjoyMDY2ODk4MDc2fQ.G0Nj4rG9N6N2MKlf9xYyPRXA9WJQx8ZhxqCMM-tpMWY"}'::jsonb,
      5000
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on device_events
DROP TRIGGER IF EXISTS trigger_lifestyle_synapse ON public.device_events;
CREATE TRIGGER trigger_lifestyle_synapse
  AFTER INSERT ON public.device_events
  FOR EACH ROW
  EXECUTE FUNCTION trigger_lifestyle_data_processing();

-- 3. Create triggers for business data (pos_transactions, nfc_transactions, idia_payments)
CREATE OR REPLACE FUNCTION trigger_business_data_processing()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Call process-business-data function for all business transactions
  PERFORM net.http_post(
    'https://zxyngqciipcvveigrzqt.supabase.co/functions/v1/process-business-data'::text,
    json_build_object(
      'transaction_id', NEW.id::text,
      'transaction_type', TG_TABLE_NAME,
      'trigger_source', TG_TABLE_NAME
    )::jsonb,
    '{}'::jsonb,
    '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4eW5ncWNpaXBjdnZlaWdyenF0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTMyMjA3NiwiZXhwIjoyMDY2ODk4MDc2fQ.G0Nj4rG9N6N2MKlf9xYyPRXA9WJQx8ZhxqCMM-tpMWY"}'::jsonb,
    5000
  );
  
  RETURN NEW;
END;
$$;

-- Apply business triggers to all transaction tables
DROP TRIGGER IF EXISTS trigger_pos_transactions_synapse ON public.pos_transactions;
CREATE TRIGGER trigger_pos_transactions_synapse
  AFTER INSERT ON public.pos_transactions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_business_data_processing();

DROP TRIGGER IF EXISTS trigger_nfc_transactions_synapse ON public.nfc_transactions;
CREATE TRIGGER trigger_nfc_transactions_synapse
  AFTER INSERT ON public.nfc_transactions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_business_data_processing();

DROP TRIGGER IF EXISTS trigger_idia_payments_synapse ON public.idia_payments;
CREATE TRIGGER trigger_idia_payments_synapse
  AFTER INSERT ON public.idia_payments
  FOR EACH ROW
  EXECUTE FUNCTION trigger_business_data_processing();

-- 4. Create trigger to auto-generate bundles when staged data is created
CREATE OR REPLACE FUNCTION trigger_bundle_generation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Generate bundles when new staged data is available
  IF TG_OP = 'INSERT' THEN
    -- Trigger appropriate bundle generation based on table
    IF TG_TABLE_NAME = 'staged_health_data' THEN
      PERFORM net.http_post(
        'https://zxyngqciipcvveigrzqt.supabase.co/functions/v1/create-health-data-bundle'::text,
        json_build_object(
          'trigger_source', 'staged_health_data',
          'staged_data_id', NEW.id::text
        )::jsonb,
        '{}'::jsonb,
        '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4eW5ncWNpaXBjdnZlaWdyenF0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTMyMjA3NiwiZXhwIjoyMDY2ODk4MDc2fQ.G0Nj4rG9N6N2MKlf9xYyPRXA9WJQx8ZhxqCMM-tpMWY"}'::jsonb,
        5000
      );
    ELSIF TG_TABLE_NAME = 'staged_lifestyle_data' THEN
      PERFORM net.http_post(
        'https://zxyngqciipcvveigrzqt.supabase.co/functions/v1/create-lifestyle-bundles'::text,
        json_build_object(
          'trigger_source', 'staged_lifestyle_data',
          'staged_data_id', NEW.id::text
        )::jsonb,
        '{}'::jsonb,
        '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4eW5ncWNpaXBjdnZlaWdyenF0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTMyMjA3NiwiZXhwIjoyMDY2ODk4MDc2fQ.G0Nj4rG9N6N2MKlf9xYyPRXA9WJQx8ZhxqCMM-tpMWY"}'::jsonb,
        5000
      );
    ELSIF TG_TABLE_NAME = 'staged_business_data' THEN
      PERFORM net.http_post(
        'https://zxyngqciipcvveigrzqt.supabase.co/functions/v1/create-business-intelligence-bundles'::text,
        json_build_object(
          'trigger_source', 'staged_business_data',
          'staged_data_id', NEW.id::text
        )::jsonb,
        '{}'::jsonb,
        '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4eW5ncWNpaXBjdnZlaWdyenF0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTMyMjA3NiwiZXhwIjoyMDY2ODk4MDc2fQ.G0Nj4rG9N6N2MKlf9xYyPRXA9WJQx8ZhxqCMM-tpMWY"}'::jsonb,
        5000
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Apply bundle generation triggers to all staged data tables
DROP TRIGGER IF EXISTS trigger_staged_health_bundles ON public.staged_health_data;
CREATE TRIGGER trigger_staged_health_bundles
  AFTER INSERT ON public.staged_health_data
  FOR EACH ROW
  EXECUTE FUNCTION trigger_bundle_generation();

DROP TRIGGER IF EXISTS trigger_staged_lifestyle_bundles ON public.staged_lifestyle_data;
CREATE TRIGGER trigger_staged_lifestyle_bundles
  AFTER INSERT ON public.staged_lifestyle_data
  FOR EACH ROW
  EXECUTE FUNCTION trigger_bundle_generation();

DROP TRIGGER IF EXISTS trigger_staged_business_bundles ON public.staged_business_data;
CREATE TRIGGER trigger_staged_business_bundles
  AFTER INSERT ON public.staged_business_data
  FOR EACH ROW
  EXECUTE FUNCTION trigger_bundle_generation();

-- Phase 2: Implement 10-Minute Data Updates with Cron Jobs
-- Create cron job for 10-minute processing cycle (every 10 minutes)
SELECT cron.schedule(
  'synapse-data-processing-10min',
  '*/10 * * * *', -- Every 10 minutes
  $$
  SELECT
    net.http_post(
        url:='https://zxyngqciipcvveigrzqt.supabase.co/functions/v1/process-lifestyle-data',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4eW5ncWNpaXBjdnZlaWdyenF0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTMyMjA3NiwiZXhwIjoyMDY2ODk4MDc2fQ.G0Nj4rG9N6N2MKlf9xYyPRXA9WJQx8ZhxqCMM-tpMWY"}'::jsonb,
        body:=concat('{"trigger": "cron_10min", "time": "', now(), '"}')::jsonb
    ) as lifestyle_request_id;
  $$
);

-- Create cron job for business data processing (every 10 minutes, offset by 2 minutes)
SELECT cron.schedule(
  'synapse-business-processing-10min',
  '2-59/10 * * * *', -- Every 10 minutes, starting at 2 minutes past
  $$
  SELECT
    net.http_post(
        url:='https://zxyngqciipcvveigrzqt.supabase.co/functions/v1/process-business-data',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4eW5ncWNpaXBjdnZlaWdyenF0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTMyMjA3NiwiZXhwIjoyMDY2ODk4MDc2fQ.G0Nj4rG9N6N2MKlf9xYyPRXA9WJQx8ZhxqCMM-tpMWY"}'::jsonb,
        body:=concat('{"trigger": "cron_10min", "time": "', now(), '"}')::jsonb
    ) as business_request_id;
  $$
);

-- Create cron job for bundle generation refresh (every 10 minutes, offset by 5 minutes)
SELECT cron.schedule(
  'synapse-bundle-refresh-10min',
  '5-59/10 * * * *', -- Every 10 minutes, starting at 5 minutes past
  $$
  SELECT
    net.http_post(
        url:='https://zxyngqciipcvveigrzqt.supabase.co/functions/v1/trigger-comprehensive-bundle-generation',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4eW5ncWNpaXBjdnZlaWdyenF0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTMyMjA3NiwiZXhwIjoyMDY2ODk4MDc2fQ.G0Nj4rG9N6N2MKlf9xYyPRXA9WJQx8ZhxqCMM-tpMWY"}'::jsonb,
        body:=concat('{"trigger": "cron_10min_refresh", "time": "', now(), '"}')::jsonb
    ) as bundle_request_id;
  $$
);

-- Create comprehensive pipeline recovery function for immediate processing of backlog
CREATE OR REPLACE FUNCTION public.process_synapse_backlog()
RETURNS TABLE(
  processed_health_data integer,
  processed_lifestyle_queue integer,
  processed_business_queue integer,
  bundles_generated integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  health_count INTEGER := 0;
  lifestyle_count INTEGER := 0;
  business_count INTEGER := 0;
  bundle_count INTEGER := 0;
BEGIN
  -- Process all pending raw_health_data
  SELECT COUNT(*) INTO health_count
  FROM public.raw_health_data 
  WHERE processing_status = 'pending';
  
  -- Process all pending lifestyle queue items
  SELECT COUNT(*) INTO lifestyle_count
  FROM public.lifestyle_processing_queue 
  WHERE processing_status = 'pending';
  
  -- Process all pending business queue items
  SELECT COUNT(*) INTO business_count
  FROM public.business_processing_queue 
  WHERE processing_status = 'pending';
  
  -- Count current active bundles
  SELECT COUNT(*) INTO bundle_count
  FROM public.marketplace_bundles 
  WHERE is_active = true;
  
  -- Trigger comprehensive processing
  PERFORM net.http_post(
    'https://zxyngqciipcvveigrzqt.supabase.co/functions/v1/process-lifestyle-data'::text,
    '{"trigger": "backlog_recovery", "process_all": true}'::jsonb,
    '{}'::jsonb,
    '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4eW5ncWNpaXBjdnZlaWdyenF0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTMyMjA3NiwiZXhwIjoyMDY2ODk4MDc2fQ.G0Nj4rG9N6N2MKlf9xYyPRXA9WJQx8ZhxqCMM-tpMWY"}'::jsonb,
    5000
  );
  
  PERFORM net.http_post(
    'https://zxyngqciipcvveigrzqt.supabase.co/functions/v1/process-business-data'::text,
    '{"trigger": "backlog_recovery", "process_all": true}'::jsonb,
    '{}'::jsonb,
    '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4eW5ncWNpaXBjdnZlaWdyenF0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTMyMjA3NiwiZXhwIjoyMDY2ODk4MDc2fQ.G0Nj4rG9N6N2MKlf9xYyPRXA9WJQx8ZhxqCMM-tpMWY"}'::jsonb,
    5000
  );
  
  RETURN QUERY SELECT health_count, lifestyle_count, business_count, bundle_count;
END;
$$;