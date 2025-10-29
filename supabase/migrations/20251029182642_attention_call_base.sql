
begin;

-- index for created_at
do $$ begin
  if not exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where c.relkind='i' and c.relname='idx_attention_calls_created_at' and n.nspname='public'
  ) then
    create index idx_attention_calls_created_at on public.attention_calls (created_at);
  end if;
end $$;

-- optional bookkeeping column
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='attention_call_limits' and column_name='updated_at'
  ) then
    alter table public.attention_call_limits add column updated_at timestamptz default now();
  end if;
end $$;

-- enable RLS and policies
alter table public.attention_calls enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='attention_calls' and policyname='select_own_calls'
  ) then
    create policy select_own_calls on public.attention_calls
      for select using (auth.uid() in (sender_id, receiver_id));
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='attention_calls' and policyname='block_direct_inserts'
  ) then
    create policy block_direct_inserts on public.attention_calls
      for insert with check (false);
  end if;
end $$;

-- prune function (TTL 30s)
create or replace function public.prune_old_attention_calls()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.attention_calls
  where created_at < (now() - interval '30 seconds');
end
$$;

grant execute on function public.prune_old_attention_calls() to authenticated;

-- try to create pg_cron and schedule job (safe quoting, no semicolon in command string)
do $$
begin
  begin
    create extension if not exists pg_cron with schema extensions;
  exception when others then
    null;
  end;

  if exists (select 1 from pg_extension where extname='pg_cron') then
    if exists (select 1 from information_schema.schemata where schema_name='cron') then
      if exists (select 1 from cron.job where jobname='attention_calls_ttl_job') then
        delete from cron.job where jobname='attention_calls_ttl_job';
      end if;

      perform cron.schedule(
        'attention_calls_ttl_job',
        '* * * * *',
        'select public.prune_old_attention_calls()'
      );
    end if;
  end if;
end
$$;

commit;
