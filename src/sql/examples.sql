
-- Exemplos úteis (opcional)

-- View: atividades por dia (posts + comments + messages)
/*
create or replace view public.activity_by_day as
select day, sum(cnt) as total from (
  select date_trunc('day', created_at)::date as day, count(*) as cnt from posts group by 1
  union all
  select date_trunc('day', created_at)::date as day, count(*) as cnt from comments group by 1
  union all
  select date_trunc('day', created_at)::date as day, count(*) as cnt from messages group by 1
) x
group by 1
order by 1;
*/

-- RLS/policy esqueleto
/*
alter table public.posts enable row level security;

create policy "users can manage own posts"
on public.posts
for all
using ( auth.uid() = user_id )
with check ( auth.uid() = user_id );
*/
