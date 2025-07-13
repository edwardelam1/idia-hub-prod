-- Add automated trigger for health pipeline processing
SELECT cron.schedule(
  'process-health-data-pipeline',
  '*/5 * * * *', -- Every 5 minutes
  $$
  SELECT
    net.http_post(
        url:='https://zxyngqciipcvveigrzqt.supabase.co/functions/v1/fix-health-pipeline',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4eW5ncWNpaXBjdnZlaWdyenF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzMjIwNzYsImV4cCI6MjA2Njg5ODA3Nn0.w-fUxBsH8wZ5ewzQkGAO6sEooqPEYbYJI_vL5F36HSU"}'::jsonb,
        body:='{"automated": true, "trigger": "cron"}'::jsonb
    ) as request_id;
  $$
);