-- Message deletions per-user (audit & analytics)
create table if not exists public.message_deletions_user (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  original_content text,
  original_language text,
  deleted_by uuid not null default auth.uid(),
  deleted_at timestamptz not null default now()
);

alter table public.message_deletions_user enable row level security;

-- Policies: users can insert their own deletion records; can read only their own.
create policy "insert own deletion" on public.message_deletions_user
  for insert
  with check ( user_id = auth.uid() );

create policy "select own deletion" on public.message_deletions_user
  for select
  using ( user_id = auth.uid() );

-- Optional helper view: visible messages per current_user (exclude deletions)
create or replace view public.v_messages_visible as
select m.*
from public.messages m
where not exists (
  select 1 from public.message_deletions_user d
  where d.message_id = m.id and d.user_id = auth.uid()
);