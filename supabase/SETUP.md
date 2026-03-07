# Supabase Setup (Auth + DB + Live Test Flags)

## 1) Rotate and secure keys
If any secret was shared publicly, rotate it in Supabase (and Stripe if applicable).

## 2) Environment variables
Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Required:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`
- `ENABLE_VENDOR_MODE=true`
- `ENABLE_STRICT_DB_MODE=true`
- `ENABLE_CATALOG_SEED=false`

Public beta billing phase:
- `ENABLE_VENDOR_BILLING_BYPASS=true`

Optional Stripe (for full billing flow):
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_VENDOR_PRICE_ID`
- `NEXT_PUBLIC_APP_URL` (example: `http://localhost:3000`)

## 3) Auth URL configuration
In Supabase Dashboard:
- Authentication -> URL Configuration
  - Site URL: `http://localhost:3000`
  - Redirect URL: `http://localhost:3000/auth/callback`

## 4) Enforce email confirmation
In Supabase Dashboard:
- Authentication -> Providers -> Email
  - Enable email confirmations for sign-up.

## 5) Run schema + migrations (order matters)
Run these SQL files in Supabase SQL Editor:
1. `supabase/schema.sql`
2. `supabase/migrations/20260218_vendor_mvp.sql`
3. `supabase/migrations/20260226_product_reviews.sql`
4. `supabase/migrations/20260227_shop_share_codes.sql`
5. `supabase/migrations/20260228_account_profile_fields.sql`
6. `supabase/migrations/20260301_shop_follows_guard.sql`

## 6) Verify live readiness schema
Run:
- `supabase/verify_live_readiness.sql`

Expected:
- Query returns `LIVE_READINESS_OK`.

## 7) App checks
Run:

```bash
npm run lint
npx tsc --noEmit
npm run build
```

## 8) Runtime health
After starting app:
- `GET /api/healthz` should return `ok: true`
- `GET /api/readiness` should return `ok: true`

## 9) Catalog seed behavior
`/api/catalog/seed` is intentionally disabled unless:
- `ENABLE_CATALOG_SEED=true`
- current user has `admin` role
