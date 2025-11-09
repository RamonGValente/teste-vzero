create extension if not exists "pgcrypto";
create extension if not exists "pg_cron";

alter table public.messages
  add column if not exists viewed_at timestamptz,
  add column if not exists expires_at timestamptz,
  add column if not exists deleted_at timestamptz;

create index if not exists idx_messages_expires_at on public.messages(expires_at) where deleted_at is null;
create index if not exists idx_messages_conv on public.messages(conversation_id);
create index if not exists idx_messages_user on public.messages(user_id);