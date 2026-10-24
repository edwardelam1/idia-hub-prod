DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'signal-heartbeat-monitor') THEN
    PERFORM cron.unschedule('signal-heartbeat-monitor');
  END IF;
END $$;

DROP FUNCTION IF EXISTS public.maintain_real_time_signals();