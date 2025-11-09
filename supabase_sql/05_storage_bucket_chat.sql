insert into storage.buckets (id, name, public)
values ('chat', 'chat', true)
on conflict (id) do nothing;

drop policy if exists "chat_public_read" on storage.objects;
create policy "chat_public_read"
on storage.objects for select
using ( bucket_id = 'chat' );

drop policy if exists "chat_authenticated_insert" on storage.objects;
create policy "chat_authenticated_insert"
on storage.objects for insert to authenticated
with check ( bucket_id = 'chat' );