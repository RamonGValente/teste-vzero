-- helper
create or replace function public.is_participant(p_conversation_id uuid, p_user uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.conversation_participants cp
    where cp.conversation_id = p_conversation_id
      and cp.user_id = p_user
  );
$$;

-- marcar visualização (inicia T-2:00)
create or replace function public.mark_viewed(p_message_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_conv uuid;
  v_author uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select conversation_id, user_id
    into v_conv, v_author
  from public.messages
  where id = p_message_id;

  if not found then
    raise exception 'message not found';
  end if;

  if not public.is_participant(v_conv, auth.uid()) then
    raise exception 'not a participant';
  end if;

  if v_author = auth.uid() then
    return; -- autor não dispara contagem
  end if;

  update public.messages
     set viewed_at  = coalesce(viewed_at, now()),
         expires_at = case when viewed_at is null then now() + interval '2 minutes' else expires_at end
   where id = p_message_id
     and viewed_at is null;
end;
$$;

-- limpeza (soft delete)
create or replace function public.delete_expired_messages()
returns void
language plpgsql
security definer
as $$
begin
  update public.messages
     set deleted_at = now(),
         is_deleted = true,
         content = null,
         media_urls = null,
         updated_at = now()
   where expires_at is not null
     and expires_at <= now()
     and deleted_at is null;
end;
$$;

-- perfil por email
create or replace function public.get_user_by_email(p_email text)
returns public.profiles
language sql
security definer
stable
as $$
  select p.*
    from auth.users u
    join public.profiles p on p.id = u.id
   where lower(u.email) = lower(p_email)
  limit 1;
$$;

-- criar/pegar DM 1:1
create or replace function public.get_or_create_dm_conversation(p_user_a uuid, p_user_b uuid)
returns public.conversations
language plpgsql
security definer
as $$
declare
  v_conv public.conversations;
  v_a uuid := p_user_a;
  v_b uuid := p_user_b;
  v_tmp uuid;
begin
  if v_a = v_b then
    raise exception 'cannot create DM with same user';
  end if;

  if v_a::text > v_b::text then
    v_tmp := v_a; v_a := v_b; v_b := v_tmp;
  end if;

  select c.* into v_conv
  from public.conversations c
  where c.is_group = false
    and exists (select 1 from public.conversation_participants cp where cp.conversation_id = c.id and cp.user_id = v_a)
    and exists (select 1 from public.conversation_participants cp where cp.conversation_id = c.id and cp.user_id = v_b)
  limit 1;

  if found then return v_conv; end if;

  insert into public.conversations(is_group, name, is_temporary, max_participants)
  values(false, null, false, 2)
  returning * into v_conv;

  insert into public.conversation_participants(conversation_id, user_id) values (v_conv.id, v_a);
  insert into public.conversation_participants(conversation_id, user_id) values (v_conv.id, v_b);

  return v_conv;
end;
$$;

-- enviar texto
create or replace function public.send_text_message(p_conversation_id uuid, p_text text)
returns public.messages
language plpgsql
security definer
as $$
declare
  v_msg public.messages;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if not public.is_participant(p_conversation_id, auth.uid()) then
    raise exception 'not a participant';
  end if;

  insert into public.messages(conversation_id, user_id, content, is_edited, is_deleted)
  values (p_conversation_id, auth.uid(), p_text, false, false)
  returning * into v_msg;

  return v_msg;
end;
$$;

-- enviar mídias (array de URLs)
create or replace function public.send_media_message(p_conversation_id uuid, p_media_urls text[])
returns public.messages
language plpgsql
security definer
as $$
declare
  v_msg public.messages;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if not public.is_participant(p_conversation_id, auth.uid()) then
    raise exception 'not a participant';
  end if;

  insert into public.messages(conversation_id, user_id, media_urls, is_edited, is_deleted)
  values (p_conversation_id, auth.uid(), p_media_urls, false, false)
  returning * into v_msg;

  return v_msg;
end;
$$;