-- Vendor MVP migration
-- Run after base schema.sql has been applied.

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'shop_status') then
    create type public.shop_status as enum ('draft', 'active', 'paused', 'unpaid');
  end if;

  if not exists (select 1 from pg_type where typname = 'vendor_onboarding_status') then
    create type public.vendor_onboarding_status as enum ('not_started', 'in_progress', 'completed');
  end if;

  if not exists (select 1 from pg_type where typname = 'vendor_order_status') then
    create type public.vendor_order_status as enum ('new', 'processing', 'shipped', 'delivered', 'canceled');
  end if;
end
$$;

alter table public.shops
  add column if not exists status public.shop_status not null default 'draft',
  add column if not exists shipping_flat_fee_usd numeric(10,2) not null default 0 check (shipping_flat_fee_usd >= 0),
  add column if not exists offers_pickup boolean not null default false,
  add column if not exists published_at timestamptz,
  add column if not exists unpublished_at timestamptz,
  add column if not exists unpublished_reason text,
  add column if not exists stripe_connect_account_id text;

update public.shops
set status = case
  when is_active = true then 'active'::public.shop_status
  else 'draft'::public.shop_status
end
where status = 'draft';

do $$
begin
  if not exists (
    select 1
    from public.shops
    group by vendor_profile_id
    having count(*) > 1
  ) then
    create unique index if not exists idx_shops_vendor_profile_unique
      on public.shops(vendor_profile_id);
  end if;
end
$$;

alter table public.vendor_subscriptions
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists stripe_price_id text,
  add column if not exists last_invoice_status text,
  add column if not exists cancel_at_period_end boolean not null default false;

create table if not exists public.vendor_onboarding (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  status public.vendor_onboarding_status not null default 'not_started',
  current_step integer not null default 1 check (current_step between 1 and 8),
  data_json jsonb not null default '{}'::jsonb,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  title text not null,
  sku text,
  attributes_json jsonb not null default '{}'::jsonb,
  price_usd numeric(10,2) not null check (price_usd >= 0),
  stock_qty integer not null default 0 check (stock_qty >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_product_variants_product_id on public.product_variants(product_id);
create unique index if not exists idx_product_variants_product_sku_unique
  on public.product_variants(product_id, sku)
  where sku is not null;

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  image_url text not null,
  alt text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_product_images_product_id on public.product_images(product_id);

create table if not exists public.shop_policies (
  shop_id uuid primary key references public.shops(id) on delete cascade,
  refund_policy text not null default '',
  shipping_policy text not null default '',
  privacy_policy text not null default '',
  terms text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.stripe_webhook_events (
  id text primary key,
  type text not null,
  payload jsonb not null,
  processed_at timestamptz not null default now()
);

alter table public.orders
  add column if not exists vendor_status public.vendor_order_status not null default 'new';

alter table public.cart_items
  add column if not exists product_variant_id uuid references public.product_variants(id) on delete set null;

alter table public.order_items
  add column if not exists product_variant_id uuid references public.product_variants(id) on delete set null;

insert into public.product_variants (
  product_id,
  title,
  sku,
  attributes_json,
  price_usd,
  stock_qty,
  is_active
)
select
  p.id,
  'Default',
  'SKU-' || substr(replace(p.id::text, '-', ''), 1, 12),
  '{}'::jsonb,
  p.price_usd,
  100,
  true
from public.products p
where not exists (
  select 1
  from public.product_variants pv
  where pv.product_id = p.id
);

update public.cart_items c
set product_variant_id = pv.id
from public.product_variants pv
where c.product_variant_id is null
  and pv.product_id = c.product_id
  and pv.id = (
    select pv2.id
    from public.product_variants pv2
    where pv2.product_id = c.product_id
    order by pv2.created_at asc
    limit 1
  );

update public.order_items oi
set product_variant_id = pv.id
from public.product_variants pv
where oi.product_variant_id is null
  and pv.product_id = oi.product_id
  and pv.id = (
    select pv2.id
    from public.product_variants pv2
    where pv2.product_id = oi.product_id
    order by pv2.created_at asc
    limit 1
  );

-- Keep updated_at fresh on new tables
drop trigger if exists trg_vendor_onboarding_updated_at on public.vendor_onboarding;
create trigger trg_vendor_onboarding_updated_at
before update on public.vendor_onboarding
for each row execute function public.set_updated_at();

drop trigger if exists trg_product_variants_updated_at on public.product_variants;
create trigger trg_product_variants_updated_at
before update on public.product_variants
for each row execute function public.set_updated_at();

drop trigger if exists trg_shop_policies_updated_at on public.shop_policies;
create trigger trg_shop_policies_updated_at
before update on public.shop_policies
for each row execute function public.set_updated_at();

-- RLS
alter table public.vendor_onboarding enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_images enable row level security;
alter table public.shop_policies enable row level security;
alter table public.stripe_webhook_events enable row level security;

drop policy if exists "shops_public_read_active" on public.shops;
create policy "shops_public_read_active"
on public.shops for select
using (is_active = true and status = 'active');

drop policy if exists "shops_vendor_read_own" on public.shops;
create policy "shops_vendor_read_own"
on public.shops for select
using (vendor_profile_id = auth.uid());

drop policy if exists "products_vendor_read_own_shop" on public.products;
create policy "products_vendor_read_own_shop"
on public.products for select
using (
  exists (
    select 1
    from public.shops s
    where s.id = products.shop_id
      and s.vendor_profile_id = auth.uid()
  )
);

drop policy if exists "vendor_onboarding_own_all" on public.vendor_onboarding;
create policy "vendor_onboarding_own_all"
on public.vendor_onboarding for all
using (auth.uid() = profile_id)
with check (auth.uid() = profile_id);

drop policy if exists "shop_policies_public_read_active_shop" on public.shop_policies;
create policy "shop_policies_public_read_active_shop"
on public.shop_policies for select
using (
  exists (
    select 1
    from public.shops s
    where s.id = shop_policies.shop_id
      and s.is_active = true
      and s.status = 'active'
  )
);

drop policy if exists "shop_policies_vendor_mutate_own_shop" on public.shop_policies;
create policy "shop_policies_vendor_mutate_own_shop"
on public.shop_policies for all
using (
  exists (
    select 1
    from public.shops s
    where s.id = shop_policies.shop_id
      and s.vendor_profile_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.shops s
    where s.id = shop_policies.shop_id
      and s.vendor_profile_id = auth.uid()
  )
);

drop policy if exists "product_variants_public_read_active" on public.product_variants;
create policy "product_variants_public_read_active"
on public.product_variants for select
using (
  is_active = true
  and exists (
    select 1
    from public.products p
    join public.shops s on s.id = p.shop_id
    where p.id = product_variants.product_id
      and p.is_active = true
      and s.is_active = true
      and s.status = 'active'
  )
);

drop policy if exists "product_variants_vendor_mutate_own_shop" on public.product_variants;
create policy "product_variants_vendor_mutate_own_shop"
on public.product_variants for all
using (
  exists (
    select 1
    from public.products p
    join public.shops s on s.id = p.shop_id
    where p.id = product_variants.product_id
      and s.vendor_profile_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.products p
    join public.shops s on s.id = p.shop_id
    where p.id = product_variants.product_id
      and s.vendor_profile_id = auth.uid()
  )
);

drop policy if exists "product_images_public_read_active" on public.product_images;
create policy "product_images_public_read_active"
on public.product_images for select
using (
  exists (
    select 1
    from public.products p
    join public.shops s on s.id = p.shop_id
    where p.id = product_images.product_id
      and p.is_active = true
      and s.is_active = true
      and s.status = 'active'
  )
);

drop policy if exists "product_images_vendor_mutate_own_shop" on public.product_images;
create policy "product_images_vendor_mutate_own_shop"
on public.product_images for all
using (
  exists (
    select 1
    from public.products p
    join public.shops s on s.id = p.shop_id
    where p.id = product_images.product_id
      and s.vendor_profile_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.products p
    join public.shops s on s.id = p.shop_id
    where p.id = product_images.product_id
      and s.vendor_profile_id = auth.uid()
  )
);

drop policy if exists "vendor_subscriptions_owner_read" on public.vendor_subscriptions;
create policy "vendor_subscriptions_owner_read"
on public.vendor_subscriptions for select
using (
  exists (
    select 1
    from public.shops s
    where s.id = vendor_subscriptions.shop_id
      and s.vendor_profile_id = auth.uid()
  )
);

drop policy if exists "order_items_vendor_read_related_shop" on public.order_items;
create policy "order_items_vendor_read_related_shop"
on public.order_items for select
using (
  exists (
    select 1
    from public.products p
    join public.shops s on s.id = p.shop_id
    where p.id = order_items.product_id
      and s.vendor_profile_id = auth.uid()
  )
);

drop policy if exists "orders_vendor_read_related_shop" on public.orders;
create policy "orders_vendor_read_related_shop"
on public.orders for select
using (
  exists (
    select 1
    from public.order_items oi
    join public.products p on p.id = oi.product_id
    join public.shops s on s.id = p.shop_id
    where oi.order_id = orders.id
      and s.vendor_profile_id = auth.uid()
  )
);

drop policy if exists "orders_vendor_update_related_shop" on public.orders;
create policy "orders_vendor_update_related_shop"
on public.orders for update
using (
  exists (
    select 1
    from public.order_items oi
    join public.products p on p.id = oi.product_id
    join public.shops s on s.id = p.shop_id
    where oi.order_id = orders.id
      and s.vendor_profile_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.order_items oi
    join public.products p on p.id = oi.product_id
    join public.shops s on s.id = p.shop_id
    where oi.order_id = orders.id
      and s.vendor_profile_id = auth.uid()
  )
);
