# Mitiendita PR — Development Context

## What This Is

Online marketplace for local vendors in Puerto Rico. Most local sellers don't know how to use technology, so this app makes it dead simple: pay $10/mo, get a shop, share it via QR code or link. Buyers browse the marketplace or visit shops directly.

- **Business model**: $10 USD/month Stripe subscription per vendor
- **MVP payments**: **Stripe** charges vendors the **$10/mo platform subscription**. Vendors configure **Stripe Connect** (buyer pays with **card** on Stripe Checkout) and/or **ATH Móvil** (buyer pays off-app, receipt flow in-app). Shops can offer **one or both**; buyers see whatever the shop has set up. Launch readiness: subscription billing works, and **both** buyer paths are smoke-tested where enabled.
- **Target audience**: Local vendors in Puerto Rico (sellers) and their customers (buyers)
- **MVP**: Web only, mobile-first design
- **Language rule**: All code (variables, comments, function names) in English. All user-facing copy in Spanish.

## Tech Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4** + **Shadcn/UI** components
- **Supabase** — PostgreSQL, Auth (email/password), Storage (product images), RLS
- **Stripe** — vendor **subscription** ($10/mo) + **Connect** for **buyer card checkout** (connected account checkout sessions); webhooks must be live for develop and production
- **ATH Móvil** — optional buyer rail per shop: phone on file + receipt upload / vendor verification (see `supabase/MIGRATIONS_ORDER.md`)
- **Vercel** — hosting and deployment
- **React Compiler** enabled via `babel-plugin-react-compiler`

## Commands

```bash
npm run dev       # Start dev server (localhost:3000)
npm run build     # Production build (needs network for Google Fonts)
npm run lint      # ESLint
```

## Directory Structure

```
src/app/                    Next.js App Router pages
src/app/api/                API routes (vendor, stripe, shops, admin)
src/app/vendedor/           Vendor dashboard pages
src/app/[shopSlug]/         Dynamic shop & product pages
src/components/ui/          Shadcn primitives (button, card, dialog, input, etc.)
src/components/vendor/      Vendor onboarding, products, orders, settings
src/components/navigation/  Bottom nav, floating cart, floating search
src/components/cart/        Cart components
src/components/reviews/     Star rating input, review sections
src/components/search/      Home search overlay
src/components/share/       QR code preview, share popups
src/components/shop/        Follow button, shop rating display
src/components/icons/       SVG icon components
src/hooks/                  Custom hooks (favorites, overlay behaviors)
src/lib/supabase/           DB clients + data access layers
src/lib/vendor/             Vendor types, constants, billing, API helpers
src/lib/reviews/            Review types & server functions
src/lib/policies/           Policy types & client helpers
src/lib/share/              Share code utilities
src/lib/formatters.ts       Currency (USD) and date formatting
supabase/migrations/        Ordered SQL migration files
docs/                       Production runbook, test checklist
```

## Database (Supabase)

### Core Tables


| Table                   | Purpose                                           |
| ----------------------- | ------------------------------------------------- |
| `profiles`              | User accounts with role (buyer/vendor/admin)      |
| `shops`                 | Vendor shops (slug, status, share_code, branding) |
| `products`              | Products with cached rating/review_count          |
| `product_variants`      | SKU, price, stock, attributes (JSON)              |
| `product_images`        | Multiple images per product with sort order       |
| `product_reviews`       | 1-5 star reviews with optional comment            |
| `cart_items`            | User cart (product + variant + quantity)          |
| `orders`                | Order headers (status, totals)                    |
| `order_items`           | Line items with price snapshot                    |
| `favorites`             | Saved products                                    |
| `shop_follows`          | Users following shops                             |
| `vendor_onboarding`     | 8-step onboarding progress (JSON data per step)   |
| `vendor_subscriptions`  | Stripe subscription status tracking               |
| `vendor_access_codes`   | Admin-issued free tier codes                      |
| `shop_policy_versions`  | Immutable, versioned policy records               |
| `policy_templates`      | Admin-managed Spanish policy templates            |
| `stripe_webhook_events` | Webhook event log                                 |


### Key Relationships

- `shops.vendor_profile_id` → `profiles.id`
- `products.shop_id` → `shops.id`
- `product_variants.product_id` → `products.id`
- `cart_items` references both `products` and `product_variants`
- `orders` are created per-shop at checkout from cart items
- Reviews trigger auto-refresh of product and shop rating aggregates

### RLS Policies

Every table has Row Level Security enabled. Key rules:

- Public: active shops, products in active shops, reviews, policy templates
- Buyers: own profile, cart, orders, favorites, follows
- Vendors: own shop and related products/orders/subscriptions
- Admins: access code management
- Reviews blocked if reviewer owns the shop

### Migrations

Run `supabase/schema.sql`, then every file in `supabase/migrations/` in the order in **`supabase/MIGRATIONS_ORDER.md`**. See `supabase/SETUP.md` for local instructions and `docs/production-launch.md` for prod vs develop projects.

## Supabase Client Patterns

Three client types in `src/lib/supabase/`:

- **Browser client** (`client.ts`) — singleton for client components
- **Server client** (`server.ts` → `createServerClient()`) — cookie-based, for Server Components and API routes
- **Admin client** (`server.ts` → `createAdminClient()`) — service role key, bypasses RLS

Auth is handled via Supabase middleware in `middleware.ts` which refreshes sessions on every request and protects vendor/account routes.

## Stripe Integration

### Subscription flow (vendors — MVP)

1. Vendor starts onboarding → reaches billing step
2. App creates Stripe Checkout session via `/api/stripe/subscription/checkout`
3. User pays on Stripe-hosted page → redirected back
4. Webhook (`/api/stripe/webhook`) processes `checkout.session.completed` and `invoice.paid`
5. `vendor_subscriptions` table updated, shop status set to active

### Buyer checkout (MVP — Stripe and/or ATH Móvil)

- **Cards (Stripe Connect):** Buyer Checkout Session via `/api/checkout/stripe/session` when the shop has a linked Connect account (`stripe_connect_account_id`). Uses `StripeCheckoutWizard` in the cart UI.
- **ATH Móvil:** Buyer flow via `/api/checkout/ath-movil` when the shop has `ath_movil_phone` set. Vendor confirms payment from the vendor orders UI.

A shop must configure **at least one** of Connect or ATH to publish (`vendor-server` publish checks). Smoke-test **both** rails on develop (vendor with both enabled), then production, plus emails (Resend).

### Feature Flags

- `ENABLE_VENDOR_MODE` — enables vendor routes and features
- `ENABLE_STRICT_DB_MODE` — enforces real DB queries (vs. mock fallbacks)
- `ENABLE_CATALOG_SEED` — enables dev seeding endpoint
- `ENABLE_VENDOR_BILLING_BYPASS` — when `true`, skips Stripe vendor subscription requirements; defaults to on in development when unset (see `src/lib/vendor/billing-mode.ts`). Use `false` on deployed develop and production for realistic billing.

### Stripe Connect

Account linking via `/api/stripe/connect/account-link` — required for **buyer card payments** to the vendor’s connected account. Distinct from the **platform subscription** Checkout used for the $10/mo vendor fee.

## Conventions

- **Server vs Client Components**: Pages are Server Components by default. Interactive components use `"use client"` directive.
- **Data Access**: Server-side data fetching in `src/lib/supabase/` modules. Client-side via API routes.
- **Styling**: Tailwind utility classes. Custom CSS variables for brand colors (`--color-brand`, `--color-carbon`, etc.).
- **Icons**: Centralized in `src/components/icons/index.tsx`. No inline SVGs in pages.
- **Navigation**: Shared nav components in `src/components/navigation/`. Vendor has separate nav.
- **Forms**: Shadcn/UI primitives. No additional form libraries.
- **Currency**: Always USD, formatted via `src/lib/formatters.ts`.
- **Images**: Uploaded to Supabase Storage. Max 5MB. Supported: PNG, JPEG, WebP, GIF.
- **Vendor Onboarding**: 8 steps tracked in `vendor_onboarding` table with JSON data per step.

## Environment Variables

Required in `.env.local` (see `.env.example`):

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SECRET_KEY
SUPABASE_VENDOR_IMAGES_BUCKET
NEXT_PUBLIC_APP_URL
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_VENDOR_PRICE_ID
ENABLE_VENDOR_MODE=true
ENABLE_STRICT_DB_MODE=true
RESEND_API_KEY
RESEND_FROM_EMAIL
```

## MVP Gaps — What's Missing Before Launch

These are known gaps and final touches still needed:

### Critical (must-have for launch)

- **Stripe (platform — vendors)**: subscription Checkout + webhooks on develop and production with `ENABLE_VENDOR_BILLING_BYPASS=false`; shops activate after paid subscription
- **Stripe Connect (buyers — cards)**: vendor completes Connect onboarding; buyer completes **Stripe** checkout for a cart; webhooks / order payment status correct — smoke-test on develop then production
- **ATH Móvil (buyers)**: vendor sets ATH phone; buyer completes ATH flow, receipt upload, vendor verification — smoke-test on develop then production
- Buyer order confirmation / receipt page (verify UX matches emails and support expectations)
- Email notifications — **Resend** (`RESEND_API_KEY`, `RESEND_FROM_EMAIL`); welcome, order confirmations, status updates, cancellations (both payment rails where applicable)
- **Connect payout / transfer automation** beyond buyer checkout — confirm what Stripe dashboard settlement gives you; extra automation can be phased after MVP if checkout already works
- Error boundaries and user-friendly error pages (404, 500) — `notFound()` wired into shop/product pages; custom `not-found.tsx` and `error.tsx` added at app root
- SEO metadata per page (page titles, descriptions, Open Graph) — shop and product pages have generateMetadata; home covered by root layout

### Important (should-have)

- Product search / filtering on marketplace home — inline search bar filters shops by name or product name; no-results empty state; overlay kept for deep product search with thumbnails
- Vendor analytics dashboard (sales, views, top products) — `/vendedor/analiticas`; revenue totals, order counts, avg order value, 30-day revenue, top 5 products by revenue, orders by status
- Order cancellation / refund flow — buyers can cancel their own `pending` orders from `/ordenes`; vendor-side cancel already existed; Stripe refund for `paid` orders is a post-launch gap
- Image optimization and lazy loading improvements — added AVIF/WebP formats + 24h cache TTL in next.config; `priority` on first 2 shop products; removed spurious `unoptimized` from vendor thumbnails and search overlay
- Loading states for all pages — `loading.tsx` added for shop, product, favoritos, ordenes, carrito, and cuenta pages
- Rate limiting on API routes — in-memory per-IP rate limiter applied to review submission (10/15min), image uploads (30/10min), and Stripe checkout (5/10min)

### Nice-to-have (post-launch)

- Push notifications
- Vendor promotional tools (discounts, coupons)
- Native mobile app (React Native)
- Social login (Google) — Google OAuth on sign-in and sign-up; forgot/reset password flow added
- Inventory management alerts (low stock) — in-app warning badge per product card + summary banner when any active product has ≤5 units total stock

