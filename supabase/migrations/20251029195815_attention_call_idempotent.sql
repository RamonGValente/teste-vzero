
begin;

create or replace function public.attention_call_create(
  p_receiver_id uuid,
  p_message text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sender uuid;
  v_now timestamptz := now();
  v_last_global timestamptz;
  v_existing_id uuid;
  v_id uuid;
begin
  v_sender := auth.uid();
  if v_sender is null then
    raise exception 'not_authenticated';
  end if;

  if p_receiver_id is null then
    raise exception 'receiver_required';
  end if;

  if p_receiver_id = v_sender then
    raise exception 'cannot_alert_self';
  end if;

  -- silence check
  if exists (
    select 1
    from public.attention_silence_settings s
    where s.user_id   = p_receiver_id
      and s.sender_id = v_sender
      and s.silenced_until > v_now
  ) then
    raise exception 'silenced_by_receiver';
  end if;

  -- idempotence for (sender,receiver) in last 30s
  select ac.id
    into v_existing_id
  from public.attention_calls ac
  where ac.sender_id   = v_sender
    and ac.receiver_id = p_receiver_id
    and ac.created_at  > (v_now - interval '30 seconds')
  order by ac.created_at desc
  limit 1;

  if v_existing_id is not null then
    return v_existing_id;
  end if;

  -- global 10-min cooldown per sender
  select l.last_call_at into v_last_global
  from public.attention_call_limits l
  where l.user_id = v_sender
  for update;

  if found then
    if v_last_global is not null and v_last_global > (v_now - interval '10 minutes') then
      raise exception 'rate_limited_10_min';
    end if;
    update public.attention_call_limits
      set last_call_at = v_now,
          updated_at   = v_now
    where user_id = v_sender;
  else
    insert into public.attention_call_limits (user_id, last_call_at, created_at, updated_at)
    values (v_sender, v_now, v_now, v_now);
  end if;

  insert into public.attention_calls (sender_id, receiver_id, message, created_at)
  values (v_sender, p_receiver_id, p_message, v_now)
  returning id into v_id;

  return v_id;
end
$$;

grant execute on function public.attention_call_create(uuid, text) to authenticated;

commit;
