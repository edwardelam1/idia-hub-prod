
-- 1. Ensure pg_net is available
CREATE EXTENSION IF NOT EXISTS "pg_net";

-- 2. Replace the broken trigger_process_staged_data with real credentials
CREATE OR REPLACE FUNCTION public.trigger_process_staged_data()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM
    net.http_post(
      url := 'https://zxyngqciipcvveigrzqt.supabase.co/functions/v1/process-staged-data'::text,
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4eW5ncWNpaXBjdnZlaWdyenF0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTMyMjA3NiwiZXhwIjoyMDY2ODk4MDc2fQ.G0Nj4rG9N6N2MKlf9xYyPRXA9WJQx8ZhxqCMM-tpMWY"}'::jsonb,
      body := jsonb_build_object('record', to_jsonb(NEW))
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Clean up any zombie triggers on staged_lifestyle_data
DROP TRIGGER IF EXISTS on_staged_data_insert ON public.staged_lifestyle_data;
DROP TRIGGER IF EXISTS trigger_process_staged_data ON public.staged_lifestyle_data;
DROP TRIGGER IF EXISTS on_staged_lifestyle_insert ON public.staged_lifestyle_data;

-- 4. Create the clean trigger on staged_lifestyle_data
CREATE TRIGGER on_staged_lifestyle_insert
  AFTER INSERT ON public.staged_lifestyle_data
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_process_staged_data();

-- 5. Clean up any zombie triggers on staged_health_data (same pattern)
DROP TRIGGER IF EXISTS on_staged_data_insert ON public.staged_health_data;
DROP TRIGGER IF EXISTS trigger_process_staged_data ON public.staged_health_data;
DROP TRIGGER IF EXISTS on_staged_health_insert ON public.staged_health_data;

-- 6. Create the clean trigger on staged_health_data
CREATE TRIGGER on_staged_health_insert
  AFTER INSERT ON public.staged_health_data
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_process_staged_data();
