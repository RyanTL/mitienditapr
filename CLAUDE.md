# Mitiendita PR — Dev Notes

Online marketplace for local vendors in Puerto Rico. Vendors pay **$10/mo** (Stripe subscription), get a shop, and share it via QR or link. Buyers pay through **Stripe Connect** (card) and/or **ATH Móvil** (receipt flow) — shops enable one or both.

**Stack:** Next.js 16 · React 19 · TS · Tailwind v4 · Supabase · Stripe · Vercel.

**Language rule:** code/comments in English, user-facing copy in Spanish.

## Commands

```bash
npm run dev      # localhost:3000
npm run lint
npm run build    # needs network (Google Fonts)
```

## Supabase clients (`src/lib/supabase/`)

- `client.ts` — browser singleton for client components
- `server.ts → createServerClient()` — cookie-based, Server Components & API routes
- `server.ts → createAdminClient()` — service role, bypasses RLS

Auth refresh happens in `middleware.ts`; vendor/account routes are protected there. RLS is on for every table — see `supabase/migrations/` for the source of truth on schema and policies.

## Stripe

- **Vendor subscription ($10/mo):** `/api/stripe/subscription/checkout` → Stripe Checkout → webhook at `/api/stripe/webhook` updates `vendor_subscriptions` and activates the shop.
- **Buyer cards:** `/api/checkout/stripe/session` creates a Connect checkout session when the shop has `stripe_connect_account_id`. Vendor links the account via `/api/stripe/connect/account-link`.
- **Buyer ATH Móvil:** `/api/checkout/ath-movil` when shop has `ath_movil_phone`; vendor confirms from the orders UI.

A shop must have at least one buyer rail (Connect or ATH) to publish.

## Feature flags

- `ENABLE_VENDOR_MODE` — vendor routes
- `ENABLE_STRICT_DB_MODE` — real DB only (no mock fallbacks)
- `ENABLE_VENDOR_BILLING_BYPASS` — skip vendor subscription checks; defaults on in dev, must be `false` on develop/prod (`src/lib/vendor/billing-mode.ts`)

## Conventions

- Server Components by default; interactive pieces use `"use client"`.
- Server-side data via `src/lib/supabase/`; client-side via API routes.
- Currency through `src/lib/formatters.ts` (always USD).
- Icons live in `src/components/icons/` — no inline SVGs in pages.
- Shadcn primitives in `src/components/ui/`; no extra form libraries.
- Product images: Supabase Storage, ≤5MB, PNG/JPEG/WebP/GIF.
- Vendor onboarding = 8 steps tracked in `vendor_onboarding` (JSON per step).

## Deployment & Branch Strategy

**Before launch:** Direct merge from develop to main is fine:
```bash
git checkout main && git pull origin main && git merge origin/develop && git push origin main
```

**After launch (post-MVP):** Add GitHub branch protection to `main`:
1. Go to repo → **Settings** → **Branches**
2. Click **Add rule**, pattern: `main`
3. Enable:
   - ✓ Require pull request reviews (≥1 approval)
   - ✓ Require status checks to pass (lint, build)
4. This forces all changes through PR workflow

**Why:** Creates a checkpoint before prod deploys; easier to track and rollback. Develop branch goes to Vercel Preview automatically; main goes to Production after push.

**Migrations:** Always test on dev Supabase (`lscijacjyrsksrdunylt`) first, commit to develop, then apply to prod (`bylouvwcpbcpytdlnpgx`) after merging to main. Use `supabase db push` (linked to target project) or `mcp.apply_migration()` for larger changes.

## Env

See `.env.example` for the full list.
