
-- Attention call improvements: 10-min sender cooldown + auto-delete after 30s
-- Safe to run multiple times (IF NOT EXISTS guards where possible).

begin;

-- 1) Helpful index for cleanup and lookups
do $$ begin
    if not exists (
        select 1 from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where c.relkind='i' and c.relname='idx_attention_calls_created_at'
          and n.nspname='public'
    ) then
        create index idx_attention_calls_created_at on public.attention_calls (created_at);
    end if;
end $$;

-- 2) Ensure attention_call_limits has unique(user_id) (already in schema per context)
--    Add updated_at for bookkeeping (optional).
do $$ begin
    if not exists (select 1 from information_schema.columns 
                   where table_schema='public' and table_name='attention_call_limits' and column_name='updated_at') then
        alter table public.attention_call_limits
            add column updated_at timestamptz default now();
    end if;
end $$;

-- 3) RPC to create an attention call with rate limiting & silence checks
--    Returns the new attention_calls.id on success.
create or replace function public.attention_call_create(p_receiver_id uuid, p_message text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
    v_sender uuid;
    v_now timestamptz := now();
    v_last timestamptz;
    v_id uuid;
begin
    -- Require authenticated user as sender
    v_sender := auth.uid();
    if v_sender is null then
        raise exception 'not_authenticated';
    end if;

    if p_receiver_id is null then
        raise exception 'receiver_required';
    end if;

    -- Optional: block self-ping
    if p_receiver_id = v_sender then
        raise exception 'cannot_alert_self';
    end if;

    -- Respect silence settings (receiver may silence this sender)
    if exists (
        select 1 from public.attention_silence_settings s
        where s.user_id = p_receiver_id
          and s.sender_id = v_sender
          and s.silenced_until > v_now
    ) then
        raise exception 'silenced_by_receiver';
    end if;

    -- Enforce 10-minute sender cooldown (per sender across any receivers)
    -- Lock the row to avoid race under concurrency.
    select l.last_call_at into v_last
    from public.attention_call_limits l
    where l.user_id = v_sender
    for update;

    if found then
        if v_last is not null and v_last > (v_now - interval '10 minutes') then
            raise exception 'rate_limited_10_min';
        end if;
        update public.attention_call_limits
        set last_call_at = v_now,
            updated_at = v_now
        where user_id = v_sender;
    else
        insert into public.attention_call_limits (user_id, last_call_at, created_at, updated_at)
        values (v_sender, v_now, v_now, v_now);
    end if;

    -- Insert the attention call
    insert into public.attention_calls (sender_id, receiver_id, message, created_at)
    values (v_sender, p_receiver_id, p_message, v_now)
    returning id into v_id;

    return v_id;
end $$;

comment on function public.attention_call_create is
'Creates an attention call enforcing a 10-minute cooldown per sender and honoring silence settings. Returns attention_calls.id. Errors: not_authenticated, receiver_required, cannot_alert_self, silenced_by_receiver, rate_limited_10_min.';

-- 4) RLS: allow rpc to run as definer; but lock down table writes from client
-- Enable RLS if not already
do $$ begin
    if not exists (select 1 from pg_catalog.pg_policies p join pg_class c on p.tablename = c.relname 
                   where p.schemaname='public' and p.tablename='attention_calls') then
        -- Ensure RLS is on
        alter table public.attention_calls enable row level security;
    end if;
end $$;

-- Upsert policies for SELECT/INSERT limited to involved users (insert via RPC only ideally)
-- Select: sender or receiver can see
do $$ begin
    if not exists (select 1 from pg_policies where schemaname='public' and tablename='attention_calls' and policyname='select_own_calls') then
        create policy select_own_calls on public.attention_calls
        for select using (auth.uid() in (sender_id, receiver_id));
    end if;
end $$;

-- Block direct inserts from clients (force RPC usage)
do $$ begin
    if not exists (select 1 from pg_policies where schemaname='public' and tablename='attention_calls' and policyname='block_direct_inserts') then
        create policy block_direct_inserts on public.attention_calls
        for insert with check (false);
    end if;
end $$;

-- Allow rpc function to be executed by authenticated users
grant execute on function public.attention_call_create(uuid, text) to authenticated;

-- 5) TTL cleanup: delete rows older than 30 seconds.
-- Two options are provided:
-- (A) If pg_cron is available, schedule a job every minute.
-- (B) Fallback view + manual cleanup doc (see README).

-- Try to enable pg_cron (no-op if already enabled). Some projects may not allow create extension.
do $$ begin
    perform 1 from pg_extension where extname = 'pg_cron';
    if not found then
        begin
            create extension if not exists pg_cron with schema public;
        exception when others then
            -- ignore if not permitted; fallback is documented
            null;
        end;
    end if;
end $$;

-- Create a cleanup function (idempotent) and schedule it if pg_cron exists.
create or replace function public.prune_old_attention_calls()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    delete from public.attention_calls
    where created_at < (now() - interval '30 seconds');
end $$;

grant execute on function public.prune_old_attention_calls() to authenticated;

-- If pg_cron is present, schedule job every minute
do $$
begin
    if exists (select 1 from pg_extension where extname='pg_cron') then
        -- create schema if needed
        perform 1;
        -- create job if not exists
        if not exists (select 1 from cron.job where jobname='attention_calls_ttl_job') then
            perform cron.schedule('attention_calls_ttl_job', '*/1 * * * *', $$select public.prune_old_attention_calls();$$);
        end if;
    end if;
end $$;

commit;
