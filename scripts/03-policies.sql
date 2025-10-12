-- 03-policies.sql
-- Minimal RLS policies so users can create posts and read feed.
alter table posts enable row level security;
alter table profiles enable row level security;

drop policy if exists posts_read_all on posts;
create policy posts_read_all on posts for select using (true);

drop policy if exists posts_insert_own on posts;
create policy posts_insert_own on posts for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists posts_update_own on posts;
create policy posts_update_own on posts for update
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists profiles_read_all on profiles;
create policy profiles_read_all on profiles for select using (true);

drop policy if exists profiles_insert_own on profiles;
create policy profiles_insert_own on profiles for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists profiles_update_own on profiles;
create policy profiles_update_own on profiles for update
  to authenticated
  using (auth.uid() = id);
