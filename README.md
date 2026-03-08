# Mitiendita PR

Mobile-first online marketplace that lets local vendors in Puerto Rico sell their products online — no tech skills required. Vendors pay $10/mo and get a shop they can share via QR code or link.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| UI | React 19, Tailwind CSS v4, Shadcn/UI |
| Database | Supabase (PostgreSQL + Auth + Storage) |
| Payments | Stripe (Subscriptions + Connect) |
| Hosting | Vercel |

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- A Supabase project (see `supabase/SETUP.md`)
- A Stripe account with a vendor subscription price configured

### Setup

```bash
npm install
cp .env.example .env.local
```

Fill in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_VENDOR_PRICE_ID=

ENABLE_VENDOR_MODE=true
ENABLE_STRICT_DB_MODE=true
ENABLE_CATALOG_SEED=false
```

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Quality Checks

```bash
npm run lint
npm run build
```

> `npm run build` may fail in network-restricted environments because `next/font` fetches Google Fonts.

## Key Routes

### Buyer

| Route | Description |
|-------|-------------|
| `/` | Marketplace home — browse shops |
| `/{shopSlug}` | Shop page |
| `/{shopSlug}/producto/{id}` | Product detail |
| `/carrito` | Shopping cart |
| `/ordenes` | Order history |
| `/favoritos` | Saved products |
| `/cuenta` | Account settings |
| `/s/{shareCode}` | Shop shortlink redirect |

### Vendor

| Route | Description |
|-------|-------------|
| `/vendedor/onboarding` | 8-step setup wizard |
| `/vendedor/panel` | Dashboard |
| `/vendedor/productos` | Product management |
| `/vendedor/pedidos` | Order management |
| `/vendedor/tienda` | Shop settings & policies |

### API

Vendor CRUD under `/api/vendor/*`, Stripe webhooks at `/api/stripe/webhook`, public shop data at `/api/shops/*`, health probes at `/api/healthz` and `/api/readiness`.

## Project Structure

```
src/
  app/                  Route pages (App Router)
    api/                API routes (vendor, stripe, shops, admin)
    vendedor/           Vendor dashboard pages
    [shopSlug]/         Dynamic shop & product pages
  components/
    ui/                 Shadcn primitives (button, card, dialog, etc.)
    vendor/             Vendor dashboard components
    navigation/         Bottom nav, floating cart/search
    cart/               Cart components
    favorites/          Favorite toggle
    reviews/            Star ratings & review sections
    search/             Search overlay
    share/              QR code & share popups
    shop/               Follow button, ratings
    icons/              SVG icon library
  hooks/                Custom React hooks
  lib/
    supabase/           DB clients, data access layers
    vendor/             Vendor types, constants, billing helpers
    reviews/            Review types & server utils
    policies/           Policy types & client helpers
    share/              Share code utilities
    formatters.ts       Currency & date formatters
    utils.ts            General helpers
supabase/
  schema.sql            Base schema
  migrations/           Ordered SQL migrations
  SETUP.md              Local Supabase setup guide
docs/
  production-launch.md  Production deployment runbook
  live-test-checklist.md  Pre-launch verification checklist
```

## Documentation

- **[Production Launch Runbook](docs/production-launch.md)** — staging/production setup, DNS, Stripe config, release gates
- **[Live Test Checklist](docs/live-test-checklist.md)** — pre-launch smoke tests and verification
- **[Supabase Setup](supabase/SETUP.md)** — local development database setup
