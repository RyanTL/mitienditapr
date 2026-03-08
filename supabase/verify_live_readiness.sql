-- Live readiness verification for public beta.
-- Run after applying all migrations.

do $$
begin
  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'profiles'
  ) then
    raise exception 'Missing table: public.profiles';
  end if;

  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'shops'
  ) then
    raise exception 'Missing table: public.shops';
  end if;

  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'products'
  ) then
    raise exception 'Missing table: public.products';
  end if;

  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'favorites'
  ) then
    raise exception 'Missing table: public.favorites';
  end if;

  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'shop_follows'
  ) then
    raise exception 'Missing table: public.shop_follows';
  end if;

  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'cart_items'
  ) then
    raise exception 'Missing table: public.cart_items';
  end if;

  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'orders'
  ) then
    raise exception 'Missing table: public.orders';
  end if;

  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'order_items'
  ) then
    raise exception 'Missing table: public.order_items';
  end if;

  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'vendor_onboarding'
  ) then
    raise exception 'Missing table: public.vendor_onboarding';
  end if;

  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'vendor_subscriptions'
  ) then
    raise exception 'Missing table: public.vendor_subscriptions';
  end if;

  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'product_variants'
  ) then
    raise exception 'Missing table: public.product_variants';
  end if;

  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'product_reviews'
  ) then
    raise exception 'Missing table: public.product_reviews';
  end if;

  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'shop_policies'
  ) then
    raise exception 'Missing table: public.shop_policies';
  end if;

  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'policy_templates'
  ) then
    raise exception 'Missing table: public.policy_templates';
  end if;

  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'shop_policy_versions'
  ) then
    raise exception 'Missing table: public.shop_policy_versions';
  end if;

  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'vendor_policy_acceptances'
  ) then
    raise exception 'Missing table: public.vendor_policy_acceptances';
  end if;

  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'order_policy_snapshots'
  ) then
    raise exception 'Missing table: public.order_policy_snapshots';
  end if;

  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'vendor_access_codes'
  ) then
    raise exception 'Missing table: public.vendor_access_codes';
  end if;

  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'vendor_access_code_redemptions'
  ) then
    raise exception 'Missing table: public.vendor_access_code_redemptions';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'shops' and column_name = 'share_code'
  ) then
    raise exception 'Missing column: public.shops.share_code';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'phone'
  ) then
    raise exception 'Missing column: public.profiles.phone';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'address'
  ) then
    raise exception 'Missing column: public.profiles.address';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'shop_policies' and column_name = 'terms_version_id'
  ) then
    raise exception 'Missing column: public.shop_policies.terms_version_id';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'shop_policies' and column_name = 'shipping_version_id'
  ) then
    raise exception 'Missing column: public.shop_policies.shipping_version_id';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'shop_follows'
      and policyname = 'shop_follows_own_all'
  ) then
    raise exception 'Missing RLS policy: public.shop_follows -> shop_follows_own_all';
  end if;
end $$;

select 'LIVE_READINESS_OK' as status;
