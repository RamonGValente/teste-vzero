create extension if not exists pg_trgm;
create extension if not exists pgcrypto;
create extension if not exists pg_cron;

create or replace function public.fn_set_expiration_on_view()
returns trigger
language plpgsql
as $$
begin
  if (new.viewed_at is not null) and (coalesce(new.expires_at, timestamp with time zone 'epoch') = timestamp with time zone 'epoch') then
    new.expires_at := new.viewed_at + interval '2 minutes';
  end if;
  return new;
end;
$$;

DROP TRIGGER IF EXISTS trg_set_expiration_on_view ON public.messages;
create trigger trg_set_expiration_on_view
before update on public.messages
for each row
when (old.viewed_at is distinct from new.viewed_at)
execute function public.fn_set_expiration_on_view();

create or replace function public.fn_sanitize_and_expire_messages()
returns void
language plpgsql
as $$
begin
  update public.messages m
     set is_deleted = true,
         deleted_at = now(),
         content = null,
         media_urls = null
   where m.is_deleted = false
     and m.expires_at is not null
     and now() >= m.expires_at;

  delete from public.messages m
   where m.is_deleted = true
     and m.deleted_at is not null
     and m.deleted_at < now() - interval '7 days';
end;
$$;

select cron.schedule(
  job_name => 'sanitize_and_expire_messages_every_minute',
  schedule => '* * * * *',
  command  => $$select public.fn_sanitize_and_expire_messages();$$
);

create policy if not exists messages_select_for_participants
on public.messages
for select
using (
  exists (
    select 1 from public.conversation_participants cp
    where cp.conversation_id = messages.conversation_id
      and cp.user_id = auth.uid()
  )
  and is_deleted = false
);

create policy if not exists messages_update_viewed_at
on public.messages
for update
using (
  exists (
    select 1 from public.conversation_participants cp
    where cp.conversation_id = messages.conversation_id
      and cp.user_id = auth.uid()
  )
)
with check ( true );
