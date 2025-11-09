
-- Fix 403 on /rest/v1/likes by enabling RLS and adding sane policies
alter table public.likes enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='likes' and policyname='likes_select_all_authenticated') then
    create policy "likes_select_all_authenticated" on public.likes
      for select
      to authenticated, anon
      using (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='likes' and policyname='likes_insert_own') then
    create policy "likes_insert_own" on public.likes
      for insert
      to authenticated
      with check ( user_id = auth.uid() );
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='likes' and policyname='likes_delete_own') then
    create policy "likes_delete_own" on public.likes
      for delete
      to authenticated
      using ( user_id = auth.uid() );
  end if;
end $$;
