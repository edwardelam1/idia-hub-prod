-- First, unschedule existing problematic cron jobs
SELECT cron.unschedule('cleanup-duplicate-bundles');
SELECT cron.unschedule('daily-bundle-cleanup');

-- Schedule nightly data processor to run every day at midnight UTC
SELECT cron.schedule(
  'nightly-data-processor',
  '0 0 * * *', -- Every day at midnight UTC
  $$
  SELECT
    net.http_post(
        url:='https://zxyngqciipcvveigrzqt.supabase.co/functions/v1/nightly-data-processor',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4eW5ncWNpaXBjdnZlaWdyenF0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTMyMjA3NiwiZXhwIjoyMDY2ODk4MDc2fQ.G0Nj4rG9N6N2MKlf9xYyPRXA9WJQx8ZhxqCMM-tpMWY"}'::jsonb,
        body:='{"trigger": "midnight_cron", "automated": true}'::jsonb
    ) as request_id;
  $$
);

-- Schedule bundle cleanup to run at 1 AM (after midnight processing)
SELECT cron.schedule(
  'cleanup-duplicate-bundles-v2',
  '0 1 * * *', -- Daily at 1 AM UTC
  $$
  SELECT
    net.http_post(
        url:='https://zxyngqciipcvveigrzqt.supabase.co/functions/v1/cleanup-duplicate-bundles',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4eW5ncWNpaXBjdnZlaWdyenF0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTMyMjA3NiwiZXhwIjoyMDY2ODk4MDc2fQ.G0Nj4rG9N6N2MKlf9xYyPRXA9WJQx8ZhxqCMM-tpMWY"}'::jsonb,
        body:='{"trigger": "post_midnight_cleanup", "automated": true}'::jsonb
    ) as request_id;
  $$
);

-- Add a backup health pipeline processor at 30 minutes past midnight
SELECT cron.schedule(
  'backup-health-pipeline-check',
  '30 0 * * *', -- Daily at 12:30 AM UTC
  $$
  SELECT
    net.http_post(
        url:='https://zxyngqciipcvveigrzqt.supabase.co/functions/v1/fix-health-pipeline',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4eW5ncWNpaXBjdnZlaWdyenF0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTMyMjA3NiwiZXhwIjoyMDY2ODk4MDc2fQ.G0Nj4rG9N6N2MKlf9xYyPRXA9WJQx8ZhxqCMM-tpMWY"}'::jsonb,
        body:='{"trigger": "midnight_backup_check", "automated": true}'::jsonb
    ) as request_id;
  $$
);