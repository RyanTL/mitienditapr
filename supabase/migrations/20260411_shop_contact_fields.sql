-- Add vendor contact fields for buyer-facing checkout display
alter table public.shops
  add column if not exists contact_phone text,
  add column if not exists contact_instagram text,
  add column if not exists contact_facebook text,
  add column if not exists contact_whatsapp text;
