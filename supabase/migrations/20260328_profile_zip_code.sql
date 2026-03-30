-- Add zip_code column to profiles for shipping address display
alter table public.profiles
  add column if not exists zip_code text;
