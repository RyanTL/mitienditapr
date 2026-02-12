# Mitiendita PR Frontend

Mobile-first marketplace UI for local vendors and shoppers.

## Stack
- `Next.js` App Router + TypeScript
- `Tailwind CSS v4`
- Route-based UI prototypes with mock data

## Run
```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Quality Checks
```bash
npm run lint
npm run build
```

Note: `npm run build` may fail in network-restricted environments because `next/font` fetches Google Fonts.

## Routes
- `/` Home marketplace
- `/ordenes` Orders history page
- `/{shopSlug}` Shop page
- `/{shopSlug}/producto/{productId}` Product detail
- `/{shopSlug}/carrito` Cart

## Folder Structure
```text
src/
  app/
    ... route pages
  components/
    icons/                  reusable SVG icons
    navigation/             shared nav + floating action UI
    profile/                profile/account menu UI
  lib/
    mock-shop-data.ts       typed mock domain data + selectors
    formatters.ts           shared format helpers
```

## Conventions Used
- Shared UI primitives for repeated elements (icons, nav pills, floating actions)
- Typed mock domain objects (`ShopDetail`, `Product`)
- Centralized style constants for navigation geometry
- No duplicated icon SVG definitions in pages
- Pure display routes + small reusable components for easier migration to real API data

## Next Production Steps
1. Replace mock data in `src/lib/mock-shop-data.ts` with API calls.
2. Add server-side auth and session-aware user profile menu.
3. Add real cart state (database or client-store + API sync).
4. Add integration tests for route navigation and critical flows.
