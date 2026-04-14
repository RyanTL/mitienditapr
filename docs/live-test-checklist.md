# Live test checklist (public beta)

## 1) Environment flags

- `ENABLE_VENDOR_MODE=true`
- `ENABLE_STRICT_DB_MODE=true`
- `ENABLE_CATALOG_SEED=false`
- `ENABLE_VENDOR_BILLING_BYPASS=false`
- `NEXT_PUBLIC_SUPABASE_URL` set
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` set
- `SUPABASE_SECRET_KEY` set
- `SUPABASE_VENDOR_IMAGES_BUCKET` set (matches Storage bucket)
- `NEXT_PUBLIC_APP_URL` set (must match deployed URL for that environment)
- `STRIPE_SECRET_KEY` set (test on develop, live on production)
- `STRIPE_WEBHOOK_SECRET` set (per-environment webhook signing secret)
- `STRIPE_VENDOR_PRICE_ID` set
- `RESEND_API_KEY` set (emails are skipped if missing)
- `RESEND_FROM_EMAIL` set to a verified-domain sender

## 2) Supabase security

- Email confirmation required in Supabase Auth settings.
- Sign-up / sign-in / reset rate limits configured in Supabase Auth settings.
- Any exposed keys rotated (`SUPABASE_SECRET_KEY`, Stripe secrets).
- RLS enabled for user-owned tables.

## 3) Database parity

- In **each** Supabase project: run `supabase/schema.sql`, then **all** migrations in order per `[supabase/MIGRATIONS_ORDER.md](../supabase/MIGRATIONS_ORDER.md)`.
- Run `supabase/verify_live_readiness.sql` and verify `**LIVE_READINESS_OK`**.

## 4) Runtime checks

- `npm run verify:release -- https://<YOUR_DEVELOP_APP_URL>` (branch `develop` / Preview). Prefer a stable origin such as `**https://dev.mitiendita.<your-tld>`** once DNS points to Vercel.
- `npm run verify:release -- https://mitienditapr.com` (or your production URL) before public cutover.
- `GET /api/healthz` returns `ok: true`.
- `GET /api/readiness` returns HTTP 200 and `ok: true`.
- `POST /api/catalog/seed` is disabled in live mode (`ENABLE_CATALOG_SEED=false`).

## 5) Quality gate

- `npm run lint` passes.
- `npm run typecheck` passes.
- `npm run build` passes in a clean environment.
- `npm run build` uses webpack until the Turbopack production stall is resolved.

## 6) Smoke scenarios

**MVP — payment rails:** (1) **Platform Stripe**: vendor completes **$10/mo** paid subscription (`ENABLE_VENDOR_BILLING_BYPASS=false`), webhooks update `vendor_subscriptions`, shop can go live. (2) **Buyer Stripe (Connect)**: vendor has linked Connect; buyer pays cart with **card**; order/payment status correct. (3) **Buyer ATH Móvil**: vendor has ATH phone set; buyer completes ATH flow; vendor can verify payment and statuses/emails behave as expected. Test a shop that has **both** Connect and ATH enabled, plus shops with only one rail.

- Buyer signup / signin / logout works with confirmed email.
- Home shows only DB shops; empty state is clean if no shops.
- Follow / unfollow updates shop button and profile `Seguidos`.
- Favorite add / remove works and persists.
- Cart add / remove / quantity / checkout works from product and home (including ATH Móvil checkout path).
- Reviews create / update / delete works for signed-in buyers.
- Vendor onboarding works with `ENABLE_VENDOR_BILLING_BYPASS=false` and billing activation completes.
- Vendor can create / edit / delete products and publish shop.
- Shop share link and QR flow works for owner; `/s/{shareCode}` redirects.
- Cuenta page updates name / phone / address / email and password.
- Transactional emails received where applicable (welcome, order placed, status changes) when Resend is configured.
- Runtime flags confirmed on develop and production:
  - `ENABLE_STRICT_DB_MODE=true`
  - `ENABLE_CATALOG_SEED=false`
  - `ENABLE_VENDOR_BILLING_BYPASS=false`

## 7) Live test operations

- **Develop** deployment is green before **main** / production cutover.
- Day-1 cohort ready (e.g. 5 vendors, 20 buyers).
- Daily bug triage time fixed and documented.
- P0 / P1 hotfix SLA <= 24h.
- Exit criteria tracked: zero P0, no data corruption, stable funnel for 72h.