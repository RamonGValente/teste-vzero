-- Função para atualizar presença com SECURITY DEFINER
create or replace function public.set_presence(p_online boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  update public.profiles
     set status    = case when p_online then 'online' else 'offline' end,
         last_seen = now(),
         updated_at = now()
   where id = v_uid;
end;
$$;

grant execute on function public.set_presence(boolean) to authenticated;

-- Política: usuário só atualiza o próprio perfil (fallback do hook)
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Garante realtime
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname='supabase_realtime' and schemaname='public' and tablename='profiles'
  ) then
    execute 'alter publication supabase_realtime add table public.profiles';
  end if;
end $$;
