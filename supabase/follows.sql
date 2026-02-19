-- Run this once in Supabase SQL Editor to enable follow/unfollow persistence.

create table if not exists public.shop_follows (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  shop_id uuid not null references public.shops(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (profile_id, shop_id)
);

create index if not exists idx_shop_follows_profile_id
on public.shop_follows(profile_id);

alter table public.shop_follows enable row level security;

drop policy if exists "shop_follows_own_all" on public.shop_follows;
create policy "shop_follows_own_all"
on public.shop_follows for all
using (auth.uid() = profile_id)
with check (auth.uid() = profile_id);
