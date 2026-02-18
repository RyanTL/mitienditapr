-- Mitiendita PR - Core schema for Supabase Auth + DB
-- Run this in Supabase SQL Editor after creating the project.

create extension if not exists pgcrypto;

-- ---------- Profiles ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  full_name text,
  avatar_url text,
  role text not null default 'buyer' check (role in ('buyer', 'vendor', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- Shops ----------
create table if not exists public.shops (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  vendor_profile_id uuid not null references public.profiles(id) on delete cascade,
  vendor_name text not null,
  description text not null default '',
  logo_url text,
  rating numeric(2,1) not null default 0.0,
  review_count integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- Products ----------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  name text not null,
  description text not null default '',
  price_usd numeric(10,2) not null check (price_usd >= 0),
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_products_shop_id on public.products(shop_id);

-- ---------- Favorites ----------
create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (profile_id, product_id)
);

create index if not exists idx_favorites_profile_id on public.favorites(profile_id);

-- ---------- Cart ----------
create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity integer not null check (quantity > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, product_id)
);

create index if not exists idx_cart_items_profile_id on public.cart_items(profile_id);

-- ---------- Orders ----------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'fulfilled', 'cancelled', 'refunded')),
  subtotal_usd numeric(10,2) not null default 0 check (subtotal_usd >= 0),
  total_usd numeric(10,2) not null default 0 check (total_usd >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_orders_profile_id on public.orders(profile_id);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  unit_price_usd numeric(10,2) not null check (unit_price_usd >= 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_order_items_order_id on public.order_items(order_id);

-- ---------- Subscription status (vendor side) ----------
create table if not exists public.vendor_subscriptions (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null unique references public.shops(id) on delete cascade,
  provider text not null default 'stripe',
  provider_subscription_id text,
  status text not null default 'inactive'
    check (status in ('active', 'past_due', 'canceled', 'inactive')),
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- Trigger: keep updated_at fresh ----------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_shops_updated_at on public.shops;
create trigger trg_shops_updated_at
before update on public.shops
for each row execute function public.set_updated_at();

drop trigger if exists trg_products_updated_at on public.products;
create trigger trg_products_updated_at
before update on public.products
for each row execute function public.set_updated_at();

drop trigger if exists trg_cart_items_updated_at on public.cart_items;
create trigger trg_cart_items_updated_at
before update on public.cart_items
for each row execute function public.set_updated_at();

drop trigger if exists trg_orders_updated_at on public.orders;
create trigger trg_orders_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

drop trigger if exists trg_vendor_subscriptions_updated_at on public.vendor_subscriptions;
create trigger trg_vendor_subscriptions_updated_at
before update on public.vendor_subscriptions
for each row execute function public.set_updated_at();

-- ---------- Profile bootstrap on sign-up ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------- RLS ----------
alter table public.profiles enable row level security;
alter table public.shops enable row level security;
alter table public.products enable row level security;
alter table public.favorites enable row level security;
alter table public.cart_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.vendor_subscriptions enable row level security;

-- Profiles: users manage only their own profile
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles for select
using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

-- Shops: public read active shops
drop policy if exists "shops_public_read_active" on public.shops;
create policy "shops_public_read_active"
on public.shops for select
using (is_active = true);

-- Shops: vendor owner can insert/update/delete own shop
drop policy if exists "shops_vendor_insert_own" on public.shops;
create policy "shops_vendor_insert_own"
on public.shops for insert
with check (auth.uid() = vendor_profile_id);

drop policy if exists "shops_vendor_update_own" on public.shops;
create policy "shops_vendor_update_own"
on public.shops for update
using (auth.uid() = vendor_profile_id)
with check (auth.uid() = vendor_profile_id);

drop policy if exists "shops_vendor_delete_own" on public.shops;
create policy "shops_vendor_delete_own"
on public.shops for delete
using (auth.uid() = vendor_profile_id);

-- Products: public read only active products in active shops
drop policy if exists "products_public_read_active" on public.products;
create policy "products_public_read_active"
on public.products for select
using (
  is_active = true
  and exists (
    select 1 from public.shops s
    where s.id = products.shop_id
      and s.is_active = true
  )
);

-- Products: only shop owner can mutate
drop policy if exists "products_vendor_insert_own_shop" on public.products;
create policy "products_vendor_insert_own_shop"
on public.products for insert
with check (
  exists (
    select 1 from public.shops s
    where s.id = products.shop_id
      and s.vendor_profile_id = auth.uid()
  )
);

drop policy if exists "products_vendor_update_own_shop" on public.products;
create policy "products_vendor_update_own_shop"
on public.products for update
using (
  exists (
    select 1 from public.shops s
    where s.id = products.shop_id
      and s.vendor_profile_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.shops s
    where s.id = products.shop_id
      and s.vendor_profile_id = auth.uid()
  )
);

drop policy if exists "products_vendor_delete_own_shop" on public.products;
create policy "products_vendor_delete_own_shop"
on public.products for delete
using (
  exists (
    select 1 from public.shops s
    where s.id = products.shop_id
      and s.vendor_profile_id = auth.uid()
  )
);

-- Favorites/cart/orders: users can only access their own rows
drop policy if exists "favorites_own_all" on public.favorites;
create policy "favorites_own_all"
on public.favorites for all
using (auth.uid() = profile_id)
with check (auth.uid() = profile_id);

drop policy if exists "cart_items_own_all" on public.cart_items;
create policy "cart_items_own_all"
on public.cart_items for all
using (auth.uid() = profile_id)
with check (auth.uid() = profile_id);

drop policy if exists "orders_own_all" on public.orders;
create policy "orders_own_all"
on public.orders for all
using (auth.uid() = profile_id)
with check (auth.uid() = profile_id);

drop policy if exists "order_items_own_read" on public.order_items;
create policy "order_items_own_read"
on public.order_items for select
using (
  exists (
    select 1 from public.orders o
    where o.id = order_items.order_id
      and o.profile_id = auth.uid()
  )
);

-- vendor_subscriptions: owner of related shop can read own subscription
drop policy if exists "vendor_subscriptions_owner_read" on public.vendor_subscriptions;
create policy "vendor_subscriptions_owner_read"
on public.vendor_subscriptions for select
using (
  exists (
    select 1 from public.shops s
    where s.id = vendor_subscriptions.shop_id
      and s.vendor_profile_id = auth.uid()
  )
);
