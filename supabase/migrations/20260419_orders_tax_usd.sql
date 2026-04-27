-- Puerto Rico IVU (buyer orders): store tax amount separately for receipts and UI.

alter table public.orders
  add column if not exists tax_usd numeric(10,2) not null default 0
    check (tax_usd >= 0);
