-- Fix infinite recursion between orders and order_items RLS policies.
-- The cycle: orders_vendor_read_related_shop queries order_items,
-- and order_items_own_read queries orders → infinite loop on any SELECT on orders.
-- Solution: use a SECURITY DEFINER function to look up the order's
-- profile_id without going through RLS, breaking the circular dependency.

create or replace function public.get_order_profile_id(p_order_id uuid)
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select profile_id from public.orders where id = p_order_id;
$$;

drop policy if exists "order_items_own_read" on public.order_items;
create policy "order_items_own_read"
on public.order_items for select
using (public.get_order_profile_id(order_id) = auth.uid());
