select cron.schedule(
  'delete-expired-messages-job',
  '*/1 * * * *',
  $$select public.delete_expired_messages();$$
);