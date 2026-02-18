# Supabase Setup (Auth + Database)

## 1) Rotate and secure keys
If keys were shared in chat, rotate them in Supabase immediately.

## 2) Environment variables
Copy `.env.example` to `.env.local` and fill values:

```bash
cp .env.example .env.local
```

Required:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY` (server-only)

## 3) Auth URL configuration
In Supabase Dashboard:
- Authentication > URL Configuration
  - Site URL: `http://localhost:3000`
  - Redirect URL: `http://localhost:3000/auth/callback`

## 4) Run schema
Open Supabase SQL Editor and run:
- `supabase/schema.sql`

This creates:
- profiles, shops, products, favorites, cart_items, orders, order_items, vendor_subscriptions
- triggers for `updated_at`
- profile auto-create trigger on `auth.users`
- RLS policies for tenant/user isolation

## 5) Next step in app code
Install SDK packages:

```bash
npm install @supabase/supabase-js @supabase/ssr
```

Then wire:
- Supabase browser/server/admin clients
- sign-in/sign-up/callback pages
- route protection
- replace mock data reads with DB queries
