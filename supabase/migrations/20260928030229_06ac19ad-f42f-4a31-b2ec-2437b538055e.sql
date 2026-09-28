select cron.schedule(
  'nft-radio-daily-sync',
  '0 7 * * *',
  $$
  select net.http_post(
    url := 'https://zxyngqciipcvveigrzqt.supabase.co/functions/v1/nft-radio',
    headers := jsonb_build_object('Content-Type','application/json'),
    body := jsonb_build_object('action','sync')
  );
  $$
);