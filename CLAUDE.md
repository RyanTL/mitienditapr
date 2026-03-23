# Mitiendita PR — Development Context

## What This Is

Online marketplace for local vendors in Puerto Rico. Most local sellers don't know how to use technology, so this app makes it dead simple: pay $10/mo, get a shop, share it via QR code or link. Buyers browse the marketplace or visit shops directly.

- **Business model**: $10 USD/month Stripe subscription per vendor
- **Target audience**: Local vendors in Puerto Rico (sellers) and their customers (buyers)
- **MVP**: Web only, mobile-first design
- **Language rule**: All code (variables, comments, function names) in English. All user-facing copy in Spanish.

## Tech Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4** + **Shadcn/UI** components
- **Supabase** — PostgreSQL, Auth (email/password), Storage (product images), RLS
- **Stripe** — vendor subscriptions ($10/mo) + Connect (future vendor payouts)
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

| Table | Purpose |
|-------|---------|
| `profiles` | User accounts with role (buyer/vendor/admin) |
| `shops` | Vendor shops (slug, status, share_code, branding) |
| `products` | Products with cached rating/review_count |
| `product_variants` | SKU, price, stock, attributes (JSON) |
| `product_images` | Multiple images per product with sort order |
| `product_reviews` | 1-5 star reviews with optional comment |
| `cart_items` | User cart (product + variant + quantity) |
| `orders` | Order headers (status, totals) |
| `order_items` | Line items with price snapshot |
| `favorites` | Saved products |
| `shop_follows` | Users following shops |
| `vendor_onboarding` | 8-step onboarding progress (JSON data per step) |
| `vendor_subscriptions` | Stripe subscription status tracking |
| `vendor_access_codes` | Admin-issued free tier codes |
| `shop_policy_versions` | Immutable, versioned policy records |
| `policy_templates` | Admin-managed Spanish policy templates |
| `stripe_webhook_events` | Webhook event log |

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
Run in order from `supabase/migrations/`. See `supabase/SETUP.md` for instructions.

## Supabase Client Patterns

Three client types in `src/lib/supabase/`:
- **Browser client** (`client.ts`) — singleton for client components
- **Server client** (`server.ts` → `createServerClient()`) — cookie-based, for Server Components and API routes
- **Admin client** (`server.ts` → `createAdminClient()`) — service role key, bypasses RLS

Auth is handled via Supabase middleware in `middleware.ts` which refreshes sessions on every request and protects vendor/account routes.

## Stripe Integration

### Subscription Flow
1. Vendor starts onboarding → reaches billing step
2. App creates Stripe Checkout session via `/api/stripe/subscription/checkout`
3. User pays on Stripe-hosted page → redirected back
4. Webhook (`/api/stripe/webhook`) processes `checkout.session.completed` and `invoice.paid`
5. `vendor_subscriptions` table updated, shop status set to active

### Feature Flags
- `ENABLE_VENDOR_MODE` — enables vendor routes and features
- `ENABLE_STRICT_DB_MODE` — enforces real DB queries (vs. mock fallbacks)
- `ENABLE_CATALOG_SEED` — enables dev seeding endpoint
- `BILLING_BYPASS` — skips Stripe for local development

### Stripe Connect
Account linking via `/api/stripe/connect/account-link` for future vendor payouts.

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

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SECRET_KEY
NEXT_PUBLIC_APP_URL
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_VENDOR_PRICE_ID
ENABLE_VENDOR_MODE=true
ENABLE_STRICT_DB_MODE=true
```

## MVP Gaps — What's Missing Before Launch

These are known gaps and final touches still needed:

### Critical (must-have for launch)
- [ ] Real checkout flow for buyers (order placement currently creates order but no payment collection from buyers)
- [ ] Buyer order confirmation / receipt page
- [x] Email notifications (order placed, order status updates, welcome email) — Resend integration; welcome on signup confirmation, buyer order confirmation + vendor new order on ATH Móvil checkout, buyer status updates when vendor changes order status, vendor notification when buyer cancels
- [ ] Stripe Connect payout flow for vendors (account linking exists but no payout triggers)
- [x] Error boundaries and user-friendly error pages (404, 500) — `notFound()` wired into shop/product pages; custom `not-found.tsx` and `error.tsx` added at app root
- [x] SEO metadata per page (page titles, descriptions, Open Graph) — shop and product pages have generateMetadata; home covered by root layout

### Important (should-have)
- [x] Product search / filtering on marketplace home — inline search bar filters shops by name or product name; no-results empty state; overlay kept for deep product search with thumbnails
- [x] Vendor analytics dashboard (sales, views, top products) — `/vendedor/analiticas`; revenue totals, order counts, avg order value, 30-day revenue, top 5 products by revenue, orders by status
- [x] Order cancellation / refund flow — buyers can cancel their own `pending` orders from `/ordenes`; vendor-side cancel already existed; Stripe refund for `paid` orders is a post-launch gap
- [x] Image optimization and lazy loading improvements — added AVIF/WebP formats + 24h cache TTL in next.config; `priority` on first 2 shop products; removed spurious `unoptimized` from vendor thumbnails and search overlay
- [x] Loading states for all pages — `loading.tsx` added for shop, product, favoritos, ordenes, carrito, and cuenta pages
- [x] Rate limiting on API routes — in-memory per-IP rate limiter applied to review submission (10/15min), image uploads (30/10min), and Stripe checkout (5/10min)

### Nice-to-have (post-launch)
- [ ] Push notifications
- [ ] Vendor promotional tools (discounts, coupons)
- [x] Native mobile app (React Native)
- [x] Social login (Google) — Google OAuth on sign-in and sign-up; forgot/reset password flow added
- [x] Inventory management alerts (low stock) — in-app warning badge per product card + summary banner when any active product has ≤5 units total stock
