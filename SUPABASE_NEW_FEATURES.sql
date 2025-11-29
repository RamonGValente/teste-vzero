-- Tabela para registrar visitas de perfil (Quem me visitou)
create table if not exists public.profile_visits (
  id uuid primary key default gen_random_uuid(),
  visitor_id uuid not null references public.profiles(id) on delete cascade,
  visited_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists idx_profile_visits_visited_created
  on public.profile_visits (visited_id, created_at desc);

-- RLS básica (ajuste conforme suas políticas globais)
alter table public.profile_visits enable row level security;

create policy "insert_own_visit"
  on public.profile_visits
  for insert
  with check (auth.uid() = visitor_id);

create policy "select_visits_of_me"
  on public.profile_visits
  for select
  using (auth.uid() = visited_id);

-- Tabela para subscriptions de push notification
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null,
  expiration_time timestamptz,
  keys_p256dh text,
  keys_auth text,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_push_subscriptions_endpoint
  on public.push_subscriptions (endpoint);

alter table public.push_subscriptions enable row level security;

create policy "manage_own_push_subscriptions"
  on public.push_subscriptions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
