-- 02-create-functions.sql
-- Creates handle_new_user trigger to ensure a profile exists for every auth user.
create or replace function generate_user_code()
returns text as $$
declare
  code text;
  exists_check boolean;
begin
  loop
    code := 'UDG' || lpad(floor(random() * 10000000)::text, 7, '0');
    select exists(select 1 from profiles where user_code = code) into exists_check;
    exit when not exists_check;
  end loop;
  return code;
end;
$$ language plpgsql security definer;

create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, full_name, avatar_url, user_code)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
    new.raw_user_meta_data->>'avatar_url',
    generate_user_code()
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
