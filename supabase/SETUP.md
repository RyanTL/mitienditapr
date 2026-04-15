# Supabase — Local Setup

For production/develop Supabase projects, follow `[docs/production-launch.md](../docs/production-launch.md)`. This file covers local dev only.

## 1. Env

```bash
cp .env.example .env.local
```

Fill in:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`
- `NEXT_PUBLIC_APP_URL=http://localhost:3000`
- `ENABLE_VENDOR_MODE=true`
- `ENABLE_STRICT_DB_MODE=true`
- `ENABLE_CATALOG_SEED=false`
- Stripe keys if you need billing flows: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_VENDOR_PRICE_ID`

## 2. Auth URLs (Supabase Dashboard)

Authentication → URL Configuration:

- Site URL: `http://localhost:3000`
- Redirect URL: `http://localhost:3000/auth/callback`

Authentication → Providers → Email: enable email confirmations.

## 3. Schema + migrations

Run `supabase/schema.sql` first, then every file from `[MIGRATIONS_ORDER.md](MIGRATIONS_ORDER.md)` in order via the SQL Editor.

## 4. Verify

Run `supabase/verify_live_readiness.sql` — it should return `LIVE_READINESS_OK`.

Then:

```bash
npm run lint
npm run build
npm run dev
```

`GET /api/healthz` and `/api/readiness` should both return `ok: true`.

## Notes

- `/api/catalog/seed` only works with `ENABLE_CATALOG_SEED=true` and an admin user.
- Rotate any leaked Supabase/Stripe keys from their dashboards.

