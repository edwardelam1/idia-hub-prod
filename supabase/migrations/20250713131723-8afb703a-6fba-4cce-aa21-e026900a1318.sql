-- Add scheduled cleanup job to run daily at 3 AM
SELECT cron.schedule(
  'daily-bundle-cleanup',
  '0 3 * * *', -- Every day at 3 AM
  $$
  SELECT
    net.http_post(
        url:='https://zxyngqciipcvveigrzqt.supabase.co/functions/v1/cleanup-duplicate-bundles',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4eW5ncWNpaXBjdnZlaWdyenF0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTMyMjA3NiwiZXhwIjoyMDY2ODk4MDc2fQ.G0Nj4rG9N6N2MKlf9xYyPRXA9WJQx8ZhxqCMM-tpMWY"}'::jsonb,
        body:='{"trigger": "scheduled_cleanup"}'::jsonb
    ) as request_id;
  $$
);