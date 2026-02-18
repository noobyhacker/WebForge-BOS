
SELECT cron.schedule(
  'bos-cron-processor',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://seknlowndpotkkrdcwvj.supabase.co/functions/v1/cron-processor',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNla25sb3duZHBvdGtrcmRjd3ZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0NjAwNTcsImV4cCI6MjA4NjAzNjA1N30.Rp87sSBCMQnn5bQ16g77xDnkekoVzzZKkUawnT1vFkE"}'::jsonb,
    body := '{"source": "pg_cron"}'::jsonb
  ) AS request_id;
  $$
);
