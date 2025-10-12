create or replace function public.update_self_status(new_status text)
returns void
language sql
security definer
as $$
  update public.profiles
     set status = new_status,
         last_seen = now(),
         updated_at = now()
   where id = auth.uid();
$$;
revoke all on function public.update_self_status(text) from public;
grant execute on function public.update_self_status(text) to authenticated;
