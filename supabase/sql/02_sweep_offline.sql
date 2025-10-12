-- Function: sweep_offline(expire_after_seconds int default 75)
-- Marks users as offline when their last_seen exceeds TTL.
create or replace function public.sweep_offline(expire_after_seconds int default 75)
returns integer
language plpgsql
security definer
as $$
declare
  v_count int;
begin
  update public.profiles
     set status = 'offline',
         updated_at = now()
   where status = 'online'
     and (last_seen is null or now() - last_seen > make_interval(secs => expire_after_seconds));

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.sweep_offline(int) from public;
grant execute on function public.sweep_offline(int) to authenticated;
grant execute on function public.sweep_offline(int) to service_role;
