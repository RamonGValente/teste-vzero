alter table public.messages enable row level security;

drop policy if exists "messages_select_participants" on public.messages;
create policy "messages_select_participants"
on public.messages for select
using (
  exists (
    select 1 from public.conversation_participants cp
    where cp.conversation_id = messages.conversation_id
      and cp.user_id = auth.uid()
  )
);

drop policy if exists "messages_insert_author" on public.messages;
create policy "messages_insert_author"
on public.messages for insert
with check ( auth.uid() = user_id );

drop policy if exists "messages_update_after_deleted" on public.messages;
create policy "messages_update_after_deleted"
on public.messages for update
using (
  exists (
    select 1 from public.conversation_participants cp
    where cp.conversation_id = messages.conversation_id
      and cp.user_id = auth.uid()
  )
)
with check ( deleted_at is not null );