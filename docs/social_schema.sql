-- Buckets
-- Create a public bucket named post-images in Supabase dashboard (Storage).

-- Tables
create table if not exists profiles (
  id uuid references auth.users primary key,
  username text unique,
  avatar_url text,
  bio text,
  created_at timestamp with time zone default now()
);

create table if not exists posts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) not null,
  title text not null,
  content text,
  image_url text,
  expires_at timestamp with time zone not null,
  created_at timestamp with time zone default now(),
  status text default 'active' check (status in ('active','fixed','deleted'))
);

create table if not exists post_votes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) not null,
  post_id uuid references posts(id) not null,
  vote_type text check (vote_type in ('heart','bomb')),
  created_at timestamp with time zone default now(),
  unique(user_id, post_id)
);

create table if not exists user_penalties (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) not null,
  reason text not null,
  expires_at timestamp with time zone not null,
  created_at timestamp with time zone default now()
);

-- RLS
alter table posts enable row level security;
alter table post_votes enable row level security;
alter table user_penalties enable row level security;
alter table profiles enable row level security;

create policy "read_all_posts" on posts for select using (true);
create policy "insert_own_post" on posts for insert with check (auth.uid() = user_id);
create policy "update_own_post_status" on posts for update using (auth.uid() = user_id) with check (true);

create policy "read_votes" on post_votes for select using (true);
create policy "insert_vote" on post_votes for insert with check (auth.uid() = user_id);
create policy "delete_own_vote" on post_votes for delete using (auth.uid() = user_id);

create policy "read_penalties" on user_penalties for select using (auth.uid() = user_id);
create policy "insert_penalty_admin" on user_penalties for insert with check (true);

create policy "read_profiles" on profiles for select using (true);
create policy "insert_update_own_profile" on profiles for insert with check (auth.uid() = id);
create policy "update_own_profile" on profiles for update using (auth.uid() = id);

-- Helper function to clean up expired posts (if bombs >= hearts)
create or replace function check_expired_posts()
returns void as $$
begin
  update posts p
  set status = 'deleted'
  where p.expires_at < now()
    and p.status = 'active'
    and (
      select count(*) filter (where vote_type = 'bomb') - count(*) filter (where vote_type = 'heart')
      from post_votes v where v.post_id = p.id
    ) >= 0;
end;
$$ language plpgsql;
