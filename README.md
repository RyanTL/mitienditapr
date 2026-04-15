# Mitiendita PR

Mobile-first online marketplace for local vendors in Puerto Rico. Vendors pay $10/mo, get a shop, and share it via QR or link — no tech skills needed. Buyers browse the marketplace or visit shops directly.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · Supabase · Stripe (subscription + Connect) · ATH Móvil · Vercel.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in Supabase + Stripe keys
npm run dev                  # http://localhost:3000
```

See `[supabase/SETUP.md](supabase/SETUP.md)` for the local database.

### Commands

```bash
npm run dev      # dev server
npm run lint     # eslint
npm run build    # production build (needs network for Google Fonts)
```

## Key routes

**Buyer:** `/` marketplace · `/{shopSlug}` shop · `/{shopSlug}/producto/{id}` product · `/carrito` · `/ordenes` · `/favoritos` · `/cuenta` · `/s/{shareCode}` shortlink

**Vendor:** `/vendedor/onboarding` · `/vendedor/panel` · `/vendedor/productos` · `/vendedor/pedidos` · `/vendedor/tienda`

**API:** `/api/vendor/`*, `/api/shops/*`, `/api/stripe/webhook`, `/api/healthz`, `/api/readiness`.

## Layout

```
src/app/         Pages + API routes (App Router)
src/components/  UI primitives, vendor dashboard, navigation, cart, etc.
src/lib/         Supabase clients, vendor/reviews/policies helpers, formatters
supabase/        schema.sql, migrations/, MIGRATIONS_ORDER.md
docs/            Production runbook & launch checklist
```

## Docs

- [Production launch runbook](docs/production-launch.md)
- [Live test checklist](docs/live-test-checklist.md)
- [Migrations order](supabase/MIGRATIONS_ORDER.md)

