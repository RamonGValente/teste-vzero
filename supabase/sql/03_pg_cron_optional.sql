-- Optional: schedule sweep with pg_cron every minute (fallback guardrails).
-- Requires pg_cron extension to be enabled in your database.
select
  cron.schedule(
    job_name   => 'sweep_offline_1m',
    schedule   => '* * * * *',
    command    => $$select public.sweep_offline(75);$$
  );
