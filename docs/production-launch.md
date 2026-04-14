# Production launch runbook

Git branches: **`develop`** (integration and pre-production testing) and **`main`** (production). Vercel **Production** deploys track **`main`**; **`develop`** uses **Preview** deployments (optionally with a stable custom domain).

**Preferred develop hostname:** **`dev.mitiendita`** — use the full HTTPS origin you register (e.g. `https://dev.mitiendita.com` or `https://dev.mitiendita.pr`). That URL must be exactly **`NEXT_PUBLIC_APP_URL`** on the develop deployment and the **Site URL / redirect** base for the **develop** Supabase project.

Use **two separate Supabase projects** (production vs develop) and **Stripe live vs test** credentials per environment. Production starts with a **clean database** (schema + migrations only, no dev seed data).

**MVP payment rails:**

1. **Stripe — platform:** vendor **$10/mo subscription** (Checkout + `/api/stripe/webhook`).
2. **Stripe Connect — buyers:** vendors link Connect; buyers can pay with **card** (Checkout Session for the cart).
3. **ATH Móvil — buyers:** vendors set ATH phone; buyers can pay with **ATH** (in-app flow + receipt / vendor verification).

Vendors configure **Connect and/or ATH**; shops can offer **both**. Launch readiness: subscription + **both buyer rails** smoke-tested on develop (with a shop that has both enabled), then production. Agent work may use **dev and prod** MCPs when you approve.

---

## 1) Supabase: two projects (prod + develop)

Do this **twice** — once for production, once for develop — with different project URLs and keys.

### 1a) Create project

1. Create a new Supabase project (e.g. `mitienditapr-prod` and `mitienditapr-dev`).
2. Note **Project URL**, **anon key**, and **service role** secret for Vercel env vars.

### 1b) Database schema

1. In SQL Editor, run **`supabase/schema.sql`** in full.
2. Run **all** migrations in the order listed in [`supabase/MIGRATIONS_ORDER.md`](../supabase/MIGRATIONS_ORDER.md) (15 files after `schema.sql`).
3. Run **`supabase/verify_live_readiness.sql`** and confirm the output includes **`LIVE_READINESS_OK`**.

### 1c) Auth URLs

For **each** project, under Authentication → URL configuration:

- **Site URL**: the app URL for that environment (`https://mitienditapr.com` for prod, or your develop URL such as `https://dev.mitiendita.<your-tld>` / the Vercel preview URL you standardize on).
- **Redirect URLs**: include `{APP_URL}/auth/callback` and any OAuth callbacks you use.

### 1d) Auth policy

- Email confirmation enabled for sign-up.
- Custom SMTP (recommended) and rate limits for sign-up, sign-in, and password reset.

### 1e) Storage

- Create the vendor product images bucket (name must match `SUPABASE_VENDOR_IMAGES_BUCKET` in Vercel, or omit env to use app default if applicable).
- Configure policies so vendors can upload to their shop path per your RLS/storage rules.

### 1f) “Clone” develop from production (optional)

Develop should **never** share production credentials. For **data** parity (optional):

- Restore a **sanitized** production backup into the dev project, **or** use Supabase **database branching** if your plan supports it, **or** keep dev empty with synthetic test users (simplest).

Schema parity is always: same `schema.sql` + same migration chain as above.

---

## 2) Vercel: `main` vs `develop`

### One project (typical)

1. Import the Git repo.
2. **Production Branch**: `main` → assign production domain(s) (`mitienditapr.com`, `www` redirect).
3. **Preview**: every push to `develop` builds automatically. For a **stable** develop URL, attach a **custom domain** to the **develop** branch’s latest deployment (e.g. `dev.mitienditapr.com`) or use a dedicated preview alias in Vercel.

### Two projects (stricter isolation)

- Project A: production, connected to `main` only.
- Project B: staging, root branch `develop`, separate env vars.

### Environment variable scoping

Use Vercel **Environment** scopes: **Production** vs **Preview** (and Development for `vercel dev` if needed).

| Variable | Production (`main`) | Preview / `develop` |
|----------|----------------------|----------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Prod Supabase URL | Dev Supabase URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Prod anon key | Dev anon key |
| `SUPABASE_SECRET_KEY` | Prod service role | Dev service role |
| `SUPABASE_VENDOR_IMAGES_BUCKET` | Prod bucket name | Dev bucket name |
| `NEXT_PUBLIC_APP_URL` | `https://mitienditapr.com` (or canonical prod URL) | Develop app URL (must match Supabase Site URL for that env) |
| `STRIPE_SECRET_KEY` | **Live** secret | **Test** secret |
| `STRIPE_WEBHOOK_SECRET` | Secret from **live** webhook endpoint | Secret from **test** webhook endpoint |
| `STRIPE_VENDOR_PRICE_ID` | Live recurring price ID | Test recurring price ID |
| `RESEND_API_KEY` | Production API key | Same or separate key |
| `RESEND_FROM_EMAIL` | Verified domain sender | Verified sender (can differ) |
| `ENABLE_VENDOR_MODE` | `true` | `true` |
| `ENABLE_STRICT_DB_MODE` | `true` | `true` |
| `ENABLE_CATALOG_SEED` | `false` | `false` (enable only briefly on dev if an admin needs seed) |
| `ENABLE_VENDOR_BILLING_BYPASS` | `false` | `false` (recommended for realistic subscription testing) |

---

## 3) Stripe

1. Create or verify the vendor subscription **product** and **monthly recurring price** ($10) in **both** live and test modes.
2. Create **two** webhook endpoints (same path, different full URLs):
   - **Develop**: `https://<YOUR_DEVELOP_APP_URL>/api/stripe/webhook` (test mode, test signing secret).
   - **Production**: `https://mitienditapr.com/api/stripe/webhook` (live mode, live signing secret).
3. Subscribe at minimum to:
   - `checkout.session.completed`
   - `invoice.paid`
   - `invoice.payment_failed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Store each endpoint’s **signing secret** in the matching Vercel scope (`STRIPE_WEBHOOK_SECRET`).

---

## 4) Resend (transactional email)

Without `RESEND_API_KEY`, the app **skips sending** email (see `src/lib/email/resend.ts`).

1. Create a [Resend](https://resend.com) account and verify your **sending domain**.
2. Set **`RESEND_API_KEY`** in Vercel (Production and Preview as needed).
3. Set **`RESEND_FROM_EMAIL`** to an address on the verified domain (default in code is `notificaciones@mitienditapr.com` if unset).
4. Smoke-test: sign-up welcome (auth callback), ATH checkout buyer/vendor emails, order status updates.

---

## 5) DNS (e.g. Cloudflare)

- Apex `mitienditapr.com` → Vercel (production).
- `www` → redirect or CNAME to apex per Vercel docs.
- Optional: `dev.mitienditapr.com` (or `staging.*`) → Vercel develop / preview target.
- TLS: Full (strict), Always HTTPS; enable HSTS after validation.
- Consider WAF / rate limits on `/api/*` (auth, webhooks).

---

## 6) Release gate

Before merging to `main` or tagging a release:

```bash
npm run lint
npm run typecheck
npm run build
npm run verify:release -- https://<YOUR_DEVELOP_URL>
npm run verify:release -- https://mitienditapr.com
```

- `GET /api/healthz` → `ok: true`
- `GET /api/readiness` → HTTP 200 and `ok: true` (requires env + DB; use deployed URLs, not localhost).

Notes:

- `npm run build` uses the webpack-backed production build (`package.json`). Keep it until Turbopack production is proven stable.
- Run **`verify:release`** against **deployed** URLs after env vars are set.

---

## 7) Operational checks before public cutover

Prerequisite: **develop** deployment is green (readiness + smoke) before promoting to **main**.

1. **Buyer**: sign-up, email confirm, sign-in, cart, ATH checkout, orders, favorites/follows.
2. **Vendor**: onboarding, Stripe subscription (no billing bypass), publish, product CRUD.
3. **Share**: shop link, QR, `/s/{shareCode}`.
4. **Account**: profile, address, email, password on `/cuenta`.
5. **Access codes**: admin create, vendor redeem, invalid/expired handling.
6. **Billing**: invoice failure → shop unpublished; invoice paid → republish (test in Stripe test mode on develop first).
7. **Flags on prod**: `ENABLE_STRICT_DB_MODE=true`, `ENABLE_CATALOG_SEED=false`, `ENABLE_VENDOR_BILLING_BYPASS=false`.

---

## 8) Secret handling

- Store live secrets only in Vercel / Supabase / Stripe dashboards — not in the repo.
- Rotate any key that was exposed.
