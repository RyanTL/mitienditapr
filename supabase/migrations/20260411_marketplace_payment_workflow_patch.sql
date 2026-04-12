-- Patch for databases that never ran 20260406_marketplace_payment_workflow.sql
-- (fixes PostgREST: "Could not find the 'buyer_email' column of 'orders'").
-- Safe to run if 20260406 already applied (IF NOT EXISTS / NOT EXISTS guards).

alter table public.orders
  add column if not exists payment_method text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'orders_payment_method_check'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders
      add constraint orders_payment_method_check
      check (
        payment_method is null
        or payment_method in ('stripe', 'ath_movil')
      );
  end if;
end
$$;

alter table public.orders
  add column if not exists shop_id uuid references public.shops(id) on delete restrict,
  add column if not exists payment_status text not null default 'requires_payment'
    check (
      payment_status in (
        'requires_payment',
        'awaiting_vendor_verification',
        'paid',
        'failed',
        'expired',
        'refunded'
      )
    ),
  add column if not exists fulfillment_method text not null default 'shipping'
    check (fulfillment_method in ('shipping', 'pickup')),
  add column if not exists shipping_fee_usd numeric(10,2) not null default 0
    check (shipping_fee_usd >= 0),
  add column if not exists buyer_name text,
  add column if not exists buyer_email text,
  add column if not exists buyer_phone text,
  add column if not exists shipping_address text,
  add column if not exists shipping_zip_code text,
  add column if not exists pickup_notes text;

update public.orders o
set shop_id = product_shop.shop_id
from (
  select distinct on (oi.order_id)
    oi.order_id,
    p.shop_id
  from public.order_items oi
  join public.products p on p.id = oi.product_id
  order by oi.order_id, oi.created_at asc, oi.id asc
) as product_shop
where o.shop_id is null
  and o.id = product_shop.order_id;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'phone'
  ) then
    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'profiles'
        and column_name = 'zip_code'
    ) then
      update public.orders o
      set
        buyer_name = coalesce(o.buyer_name, p.full_name),
        buyer_email = coalesce(o.buyer_email, p.email),
        buyer_phone = coalesce(o.buyer_phone, p.phone),
        shipping_address = coalesce(o.shipping_address, p.address),
        shipping_zip_code = coalesce(o.shipping_zip_code, p.zip_code)
      from public.profiles p
      where o.profile_id = p.id;
    else
      update public.orders o
      set
        buyer_name = coalesce(o.buyer_name, p.full_name),
        buyer_email = coalesce(o.buyer_email, p.email),
        buyer_phone = coalesce(o.buyer_phone, p.phone),
        shipping_address = coalesce(o.shipping_address, p.address)
      from public.profiles p
      where o.profile_id = p.id;
    end if;
  else
    update public.orders o
    set
      buyer_name = coalesce(o.buyer_name, p.full_name),
      buyer_email = coalesce(o.buyer_email, p.email)
    from public.profiles p
    where o.profile_id = p.id;
  end if;
end
$$;

update public.orders
set payment_method = coalesce(payment_method, 'ath_movil');

update public.orders
set payment_status = case
  when status = 'refunded' then 'refunded'
  when status in ('paid', 'fulfilled') then 'paid'
  when status = 'cancelled' then 'failed'
  when payment_method = 'ath_movil' then 'awaiting_vendor_verification'
  else 'requires_payment'
end
where payment_status = 'requires_payment';

update public.orders
set fulfillment_method = case
  when shipping_address is null and shipping_zip_code is null then 'pickup'
  else fulfillment_method
end
where fulfillment_method = 'shipping';

create index if not exists idx_orders_shop_id on public.orders(shop_id);
create index if not exists idx_orders_payment_status on public.orders(payment_status);
create index if not exists idx_orders_shop_payment_status
  on public.orders(shop_id, payment_status, created_at desc);

create table if not exists public.order_payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  provider text not null check (provider in ('stripe', 'ath_movil')),
  status text not null
    check (
      status in (
        'requires_payment',
        'awaiting_vendor_verification',
        'paid',
        'failed',
        'expired',
        'refunded'
      )
    ),
  amount_usd numeric(10,2) not null check (amount_usd >= 0),
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  receipt_image_bucket text,
  receipt_image_path text,
  receipt_note text,
  verified_by_profile_id uuid references public.profiles(id) on delete set null,
  verified_at timestamptz,
  failed_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_order_payments_status
  on public.order_payments(status, created_at desc);
create unique index if not exists idx_order_payments_checkout_session_unique
  on public.order_payments(stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;
create unique index if not exists idx_order_payments_payment_intent_unique
  on public.order_payments(stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

drop trigger if exists trg_order_payments_updated_at on public.order_payments;
create trigger trg_order_payments_updated_at
before update on public.order_payments
for each row execute function public.set_updated_at();

insert into public.order_payments (
  order_id,
  provider,
  status,
  amount_usd
)
select
  o.id,
  coalesce(nullif(o.payment_method, ''), 'ath_movil'),
  o.payment_status,
  o.total_usd
from public.orders o
where not exists (
  select 1
  from public.order_payments op
  where op.order_id = o.id
);

create or replace function public.get_order_shop_id(p_order_id uuid)
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select shop_id
  from public.orders
  where id = p_order_id;
$$;

alter table public.order_payments enable row level security;

drop policy if exists "order_payments_buyer_read" on public.order_payments;
create policy "order_payments_buyer_read"
on public.order_payments for select
using (public.get_order_profile_id(order_id) = auth.uid());

drop policy if exists "order_payments_vendor_read" on public.order_payments;
create policy "order_payments_vendor_read"
on public.order_payments for select
using (
  exists (
    select 1
    from public.shops s
    where s.id = public.get_order_shop_id(order_payments.order_id)
      and s.vendor_profile_id = auth.uid()
  )
);
