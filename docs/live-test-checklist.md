# Live Test Checklist (Public Beta)

## 1) Environment flags
- `ENABLE_VENDOR_MODE=true`
- `ENABLE_STRICT_DB_MODE=true`
- `ENABLE_CATALOG_SEED=false`
- `ENABLE_VENDOR_BILLING_BYPASS=false`
- `NEXT_PUBLIC_SUPABASE_URL` set
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` set
- `SUPABASE_SECRET_KEY` set
- `NEXT_PUBLIC_APP_URL` set
- `STRIPE_SECRET_KEY` set
- `STRIPE_WEBHOOK_SECRET` set
- `STRIPE_VENDOR_PRICE_ID` set

## 2) Supabase security
- Email confirmation required in Supabase Auth settings.
- Sign-up/sign-in/reset rate limits configured in Supabase Auth settings.
- Any exposed keys rotated (`SUPABASE_SECRET_KEY`, Stripe secrets).
- RLS enabled for user-owned tables.

## 3) Database parity
- Run all migrations in order:
  1. `supabase/schema.sql`
  2. `supabase/migrations/20260218_vendor_mvp.sql`
  3. `supabase/migrations/20260226_product_reviews.sql`
  4. `supabase/migrations/20260227_shop_share_codes.sql`
  5. `supabase/migrations/20260228_account_profile_fields.sql`
  6. `supabase/migrations/20260301_shop_follows_guard.sql`
  7. `supabase/migrations/20260307_vendor_policy_system.sql`
  8. `supabase/migrations/20260308_vendor_access_codes.sql`
- Run `supabase/verify_live_readiness.sql` and verify it returns `LIVE_READINESS_OK`.

## 4) Runtime checks
- Run `npm run verify:release -- https://staging.mitienditapr.com`.
- Repeat `npm run verify:release -- https://mitienditapr.com` before the public cutover.
- `GET /api/healthz` returns `ok: true`.
- `GET /api/readiness` returns HTTP 200 and `ok: true`.
- `POST /api/catalog/seed` is disabled in live mode.

## 5) Quality gate
- `npm run lint` passes.
- `npm run typecheck` passes.
- `npm run build` passes in a clean environment.
- `npm run build` uses webpack until the Turbopack production stall is resolved.

## 6) Smoke scenarios
- Buyer signup/signin/logout works with confirmed email.
- Home shows only DB shops; empty state is clean if no shops.
- Follow/unfollow updates shop button and profile `Seguidos`.
- Favorite add/remove works and persists.
- Cart add/remove/quantity/checkout works from product and home.
- Reviews create/update/delete works for signed-in buyers.
- Vendor onboarding works with billing bypass disabled and billing activation completes.
- Vendor can create/edit/delete products and publish shop.
- Shop share link and QR flow works for owner; `/s/{shareCode}` redirects.
- Cuenta page updates name/phone/address/email and password.
- Runtime flags are confirmed in staging and production:
  - `ENABLE_STRICT_DB_MODE=true`
  - `ENABLE_CATALOG_SEED=false`
  - `ENABLE_VENDOR_BILLING_BYPASS=false`

## 7) Live test operations
- Staging deployment is green before production cutover.
- Day-1 cohort ready (5 vendors, 20 buyers).
- Daily bug triage time fixed and documented.
- P0/P1 hotfix SLA <= 24h.
- Exit criteria tracked: zero P0, no data corruption, stable funnel for 72h.
