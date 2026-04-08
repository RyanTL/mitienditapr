# Production Launch Runbook

## 1) Environments

Create two environments:
- `staging` -> `staging.mitienditapr.com`
- `production` -> `mitienditapr.com` (primary), `www.mitienditapr.com` (redirect)

Use separate Supabase projects and separate Stripe modes/config for each environment.

## 2) Required Environment Variables

Set in Vercel for both staging and production:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`
- `SUPABASE_VENDOR_IMAGES_BUCKET`
- `NEXT_PUBLIC_APP_URL`
- `ENABLE_VENDOR_MODE=true`
- `ENABLE_STRICT_DB_MODE=true`
- `ENABLE_CATALOG_SEED=false`

Set in production:
- `ENABLE_VENDOR_BILLING_BYPASS=false`
- `STRIPE_SECRET_KEY` (live)
- `STRIPE_VENDOR_PRICE_ID` (live monthly $10)
- `STRIPE_WEBHOOK_SECRET` (from production Stripe endpoint)

Set in staging:
- `ENABLE_VENDOR_BILLING_BYPASS=false` (recommended for realistic testing)
- Stripe test secrets and test price ID

## 3) Supabase Setup

In each Supabase project:
1. Apply migrations in order:
   - `supabase/schema.sql`
   - `supabase/migrations/20260218_vendor_mvp.sql`
   - `supabase/migrations/20260226_product_reviews.sql`
   - `supabase/migrations/20260227_shop_share_codes.sql`
   - `supabase/migrations/20260228_account_profile_fields.sql`
   - `supabase/migrations/20260301_shop_follows_guard.sql`
   - `supabase/migrations/20260307_vendor_policy_system.sql`
   - `supabase/migrations/20260308_vendor_access_codes.sql`
2. Run `supabase/verify_live_readiness.sql` and confirm `LIVE_READINESS_OK`.
3. Auth settings:
   - Email confirmation required
   - Custom SMTP configured
   - Rate limits configured (sign up/sign in/password reset)

## 4) Stripe Setup

1. Create/verify product + recurring monthly price for vendor plan.
2. Configure webhook endpoints:
   - Staging: `https://staging.mitienditapr.com/api/stripe/webhook`
   - Production: `https://mitienditapr.com/api/stripe/webhook`
3. Subscribe webhook events:
   - `checkout.session.completed`
   - `invoice.paid`
   - `invoice.payment_failed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Store each webhook signing secret in matching environment.

## 5) Cloudflare and Domain

1. DNS:
   - Apex `mitienditapr.com` -> Vercel
   - `www` -> redirect/cname to primary
   - `staging` -> Vercel staging project
2. TLS:
   - Full (strict), Always HTTPS, HSTS enabled after validation.
3. WAF/Rate Limiting:
   - Protect `/api/*` endpoints, especially auth and webhook traffic.

## 6) Release Gate

Every deployment must pass:
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run verify:release -- https://staging.mitienditapr.com`
- Repeat `npm run verify:release -- https://mitienditapr.com` before final public cutover.
- `GET /api/healthz` -> `ok: true`
- `GET /api/readiness` -> HTTP 200 and `ok: true`

Notes:
- `npm run build` is the webpack-backed production build. Keep it on webpack until the Turbopack stall is root-caused and proven stable.
- Run the runtime probe against a deployed environment, not a local dev server.

## 7) Operational Checks Before Public Cutover

Prerequisite:
- Staging deployment is green before any production cutover.

1. Buyer smoke:
   - sign-up, email confirm, sign-in, cart, checkout, orders
   - favorites/follows stay in sync across refreshes
2. Vendor smoke:
   - onboarding, connect Stripe, pay subscription, publish, product CRUD
   - product edit/delete, publish/unpublish, and billing activation flows
3. Share and account smoke:
   - shop share link, QR flow, and `/s/{shareCode}` redirect
   - cuenta updates for profile, address, email, and password
4. Invite code smoke:
   - admin creates code
   - vendor redeems code
   - invalid/expired/exhausted code fails
5. Billing enforcement:
   - simulate invoice failure -> shop unpublished
   - simulate invoice paid -> republish
6. Runtime flag validation:
   - `ENABLE_STRICT_DB_MODE=true`
   - `ENABLE_CATALOG_SEED=false`
   - `ENABLE_VENDOR_BILLING_BYPASS=false`

## 8) Secret Handling

- Keep all live secrets only in Vercel/Cloudflare/Supabase secure environment storage.
- Rotate any Supabase or Stripe secret that was ever exposed outside approved secret storage.
