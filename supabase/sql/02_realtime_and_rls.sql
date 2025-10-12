alter table public.profiles replica identity full;
alter publication supabase_realtime add table public.profiles;

alter table public.profiles enable row level security;

drop policy if exists update_own_profile on public.profiles;
create policy update_own_profile
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists select_self_and_contacts on public.profiles;
create policy select_self_and_contacts
on public.profiles
for select
to authenticated
using (
  id = auth.uid()
  or exists (
    select 1
    from public.contacts c
    where c.user_id = auth.uid()
      and c.contact_id = profiles.id
  )
);
