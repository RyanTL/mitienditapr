-- Cuenta page profile fields + auth email sync
-- Run after base schema.sql and vendor migrations.

alter table public.profiles
  add column if not exists phone text,
  add column if not exists address text;

update public.profiles p
set phone = nullif(trim(vo.data_json->'step_2'->>'phone'), '')
from public.vendor_onboarding vo
where vo.profile_id = p.id
  and (p.phone is null or btrim(p.phone) = '')
  and nullif(trim(vo.data_json->'step_2'->>'phone'), '') is not null;

create or replace function public.handle_auth_user_updated_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set email = new.email
  where id = new.id;

  return new;
end;
$$;

drop trigger if exists trg_auth_user_email_updated on auth.users;
create trigger trg_auth_user_email_updated
after update of email on auth.users
for each row
when (old.email is distinct from new.email)
execute function public.handle_auth_user_updated_email();

