-- Product reviews MVP migration
-- Run after base schema.sql and 20260218_vendor_mvp.sql.

alter table public.products
  add column if not exists rating numeric(2,1) not null default 0.0,
  add column if not exists review_count integer not null default 0;

create table if not exists public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  reviewer_display_name text not null,
  rating smallint not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, profile_id),
  check (comment is null or char_length(comment) <= 500)
);

create index if not exists idx_product_reviews_product_created_at
  on public.product_reviews(product_id, created_at desc);
create index if not exists idx_product_reviews_profile_id
  on public.product_reviews(profile_id);

drop trigger if exists trg_product_reviews_updated_at on public.product_reviews;
create trigger trg_product_reviews_updated_at
before update on public.product_reviews
for each row execute function public.set_updated_at();

create or replace function public.refresh_product_review_summary(target_product_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.products p
  set
    rating = coalesce((
      select round(avg(pr.rating)::numeric, 1)
      from public.product_reviews pr
      where pr.product_id = target_product_id
    ), 0.0),
    review_count = (
      select count(*)::int
      from public.product_reviews pr
      where pr.product_id = target_product_id
    )
  where p.id = target_product_id;
end;
$$;

create or replace function public.refresh_shop_review_summary(target_shop_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.shops s
  set
    rating = coalesce((
      select round(avg(pr.rating)::numeric, 1)
      from public.product_reviews pr
      join public.products p on p.id = pr.product_id
      where p.shop_id = target_shop_id
    ), 0.0),
    review_count = (
      select count(*)::int
      from public.product_reviews pr
      join public.products p on p.id = pr.product_id
      where p.shop_id = target_shop_id
    )
  where s.id = target_shop_id;
end;
$$;

create or replace function public.handle_product_review_summary_refresh()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  old_shop_id uuid;
  new_shop_id uuid;
begin
  if tg_op = 'DELETE' then
    select p.shop_id into old_shop_id
    from public.products p
    where p.id = old.product_id;

    perform public.refresh_product_review_summary(old.product_id);

    if old_shop_id is not null then
      perform public.refresh_shop_review_summary(old_shop_id);
    end if;

    return null;
  end if;

  if tg_op = 'INSERT' then
    select p.shop_id into new_shop_id
    from public.products p
    where p.id = new.product_id;

    perform public.refresh_product_review_summary(new.product_id);

    if new_shop_id is not null then
      perform public.refresh_shop_review_summary(new_shop_id);
    end if;

    return null;
  end if;

  -- UPDATE
  if old.product_id is distinct from new.product_id then
    select p.shop_id into old_shop_id
    from public.products p
    where p.id = old.product_id;

    perform public.refresh_product_review_summary(old.product_id);

    if old_shop_id is not null then
      perform public.refresh_shop_review_summary(old_shop_id);
    end if;
  end if;

  select p.shop_id into new_shop_id
  from public.products p
  where p.id = new.product_id;

  perform public.refresh_product_review_summary(new.product_id);

  if new_shop_id is not null then
    perform public.refresh_shop_review_summary(new_shop_id);
  end if;

  return null;
end;
$$;

drop trigger if exists trg_product_reviews_refresh_summary on public.product_reviews;
create trigger trg_product_reviews_refresh_summary
after insert or update or delete on public.product_reviews
for each row execute function public.handle_product_review_summary_refresh();

alter table public.product_reviews enable row level security;

drop policy if exists "product_reviews_public_read_active" on public.product_reviews;
create policy "product_reviews_public_read_active"
on public.product_reviews for select
using (
  exists (
    select 1
    from public.products p
    join public.shops s on s.id = p.shop_id
    where p.id = product_reviews.product_id
      and p.is_active = true
      and s.is_active = true
      and s.status = 'active'
  )
);

drop policy if exists "product_reviews_insert_own_non_vendor" on public.product_reviews;
create policy "product_reviews_insert_own_non_vendor"
on public.product_reviews for insert
with check (
  auth.uid() = profile_id
  and not exists (
    select 1
    from public.products p
    join public.shops s on s.id = p.shop_id
    where p.id = product_reviews.product_id
      and s.vendor_profile_id = auth.uid()
  )
);

drop policy if exists "product_reviews_update_own_non_vendor" on public.product_reviews;
create policy "product_reviews_update_own_non_vendor"
on public.product_reviews for update
using (
  auth.uid() = profile_id
  and not exists (
    select 1
    from public.products p
    join public.shops s on s.id = p.shop_id
    where p.id = product_reviews.product_id
      and s.vendor_profile_id = auth.uid()
  )
)
with check (
  auth.uid() = profile_id
  and not exists (
    select 1
    from public.products p
    join public.shops s on s.id = p.shop_id
    where p.id = product_reviews.product_id
      and s.vendor_profile_id = auth.uid()
  )
);

drop policy if exists "product_reviews_delete_own_non_vendor" on public.product_reviews;
create policy "product_reviews_delete_own_non_vendor"
on public.product_reviews for delete
using (
  auth.uid() = profile_id
  and not exists (
    select 1
    from public.products p
    join public.shops s on s.id = p.shop_id
    where p.id = product_reviews.product_id
      and s.vendor_profile_id = auth.uid()
  )
);

-- Backfill summaries from existing reviews (safe when table is empty).
update public.products p
set
  rating = coalesce(summary.avg_rating, 0.0),
  review_count = coalesce(summary.total_reviews, 0)
from (
  select
    pr.product_id,
    round(avg(pr.rating)::numeric, 1) as avg_rating,
    count(*)::int as total_reviews
  from public.product_reviews pr
  group by pr.product_id
) summary
where summary.product_id = p.id;

update public.products p
set rating = 0.0,
    review_count = 0
where not exists (
  select 1
  from public.product_reviews pr
  where pr.product_id = p.id
);

update public.shops s
set
  rating = coalesce(summary.avg_rating, 0.0),
  review_count = coalesce(summary.total_reviews, 0)
from (
  select
    p.shop_id,
    round(avg(pr.rating)::numeric, 1) as avg_rating,
    count(*)::int as total_reviews
  from public.product_reviews pr
  join public.products p on p.id = pr.product_id
  group by p.shop_id
) summary
where summary.shop_id = s.id;

update public.shops s
set rating = 0.0,
    review_count = 0
where not exists (
  select 1
  from public.products p
  join public.product_reviews pr on pr.product_id = p.id
  where p.shop_id = s.id
);
