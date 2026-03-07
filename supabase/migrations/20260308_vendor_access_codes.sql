-- Owner-managed vendor access codes
-- Allows admin-issued free vendor access grants without Stripe checkout.

create table if not exists public.vendor_access_codes (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique,
  label text not null,
  is_active boolean not null default true,
  max_redemptions integer check (max_redemptions is null or max_redemptions > 0),
  redeemed_count integer not null default 0 check (redeemed_count >= 0),
  benefit_type text not null check (benefit_type in ('free_months', 'lifetime_free')),
  benefit_months integer check (benefit_months is null or benefit_months > 0),
  expires_at timestamptz,
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (benefit_type = 'free_months' and benefit_months is not null)
    or (benefit_type = 'lifetime_free' and benefit_months is null)
  )
);

create index if not exists idx_vendor_access_codes_active_expires
  on public.vendor_access_codes(is_active, expires_at);

create table if not exists public.vendor_access_code_redemptions (
  id uuid primary key default gen_random_uuid(),
  code_id uuid not null references public.vendor_access_codes(id) on delete restrict,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  shop_id uuid not null references public.shops(id) on delete cascade,
  redeemed_at timestamptz not null default now(),
  benefit_type text not null check (benefit_type in ('free_months', 'lifetime_free')),
  benefit_months integer check (benefit_months is null or benefit_months > 0),
  unique (code_id, profile_id)
);

create index if not exists idx_vendor_access_code_redemptions_profile
  on public.vendor_access_code_redemptions(profile_id, redeemed_at desc);

create index if not exists idx_vendor_access_code_redemptions_shop
  on public.vendor_access_code_redemptions(shop_id, redeemed_at desc);

drop trigger if exists trg_vendor_access_codes_updated_at on public.vendor_access_codes;
create trigger trg_vendor_access_codes_updated_at
before update on public.vendor_access_codes
for each row execute function public.set_updated_at();

alter table public.vendor_access_codes enable row level security;
alter table public.vendor_access_code_redemptions enable row level security;

drop policy if exists "vendor_access_codes_admin_all" on public.vendor_access_codes;
create policy "vendor_access_codes_admin_all"
on public.vendor_access_codes for all
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

drop policy if exists "vendor_access_code_redemptions_admin_read_all" on public.vendor_access_code_redemptions;
create policy "vendor_access_code_redemptions_admin_read_all"
on public.vendor_access_code_redemptions for select
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

drop policy if exists "vendor_access_code_redemptions_vendor_read_own" on public.vendor_access_code_redemptions;
create policy "vendor_access_code_redemptions_vendor_read_own"
on public.vendor_access_code_redemptions for select
using (profile_id = auth.uid());
