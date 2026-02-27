-- Shop share codes migration
-- Provides immutable, permanent share URLs for QR and link sharing.

create extension if not exists pgcrypto;

alter table public.shops
  add column if not exists share_code text;

create or replace function public.generate_shop_share_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  candidate text;
begin
  loop
    candidate := encode(gen_random_bytes(10), 'hex');
    exit when not exists (
      select 1
      from public.shops
      where share_code = candidate
    );
  end loop;

  return candidate;
end;
$$;

update public.shops
set share_code = public.generate_shop_share_code()
where share_code is null or btrim(share_code) = '';

alter table public.shops
  alter column share_code set not null;

create unique index if not exists idx_shops_share_code_unique
  on public.shops(share_code);

create or replace function public.assign_shop_share_code()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.share_code is null or btrim(new.share_code) = '' then
    new.share_code := public.generate_shop_share_code();
  end if;

  return new;
end;
$$;

create or replace function public.prevent_shop_share_code_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.share_code is distinct from new.share_code then
    raise exception 'share_code is immutable';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_shops_assign_share_code on public.shops;
create trigger trg_shops_assign_share_code
before insert on public.shops
for each row execute function public.assign_shop_share_code();

drop trigger if exists trg_shops_prevent_share_code_update on public.shops;
create trigger trg_shops_prevent_share_code_update
before update on public.shops
for each row execute function public.prevent_shop_share_code_update();
