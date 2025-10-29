
begin;

create or replace function public.attention_call_ack(p_call_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_receiver uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select receiver_id into v_receiver
  from public.attention_calls
  where id = p_call_id;

  if not found then
    return;
  end if;

  if v_receiver <> v_uid then
    raise exception 'forbidden_not_the_receiver';
  end if;

  delete from public.attention_calls where id = p_call_id;
end
$$;

grant execute on function public.attention_call_ack(uuid) to authenticated;

create or replace function public.attention_call_ack_many(p_call_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_deleted int := 0;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  delete from public.attention_calls ac
  using unnest(p_call_ids) as t(id)
  where ac.id = t.id
    and ac.receiver_id = v_uid;

  get diagnostics v_deleted = row_count;
  return v_deleted;
end
$$;

grant execute on function public.attention_call_ack_many(uuid[]) to authenticated;

commit;
