# Reactive Store

Online store for Reactive Store — medical, rehabilitation and healthcare supplies in Lebanon.

A monorepo with npm workspaces. The backend is being built in phases; see
[`docs/backend-plan.md`](docs/backend-plan.md) for the plan and the decisions behind it.

| Workspace | What |
| --- | --- |
| `apps/web` | Store and (soon) admin UI. Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · shadcn/ui (Radix) · lucide icons |
| `apps/api` | REST API under `/api`. NestJS 12 · Prisma 7 · PostgreSQL 17 |
| `packages/shared` | Zod schemas, enums and types used by both apps |

Until the backend phases land, orders and enquiries are still sent to the store's WhatsApp.

## Run it

Requires Node.js 22+ (24 recommended). Docker is needed for the local database.

```bash
npm install
npm run dev        # web at http://localhost:3000
npm run dev:api    # API at http://localhost:3001/api/health
```

Database (from Phase 1 onwards):

```bash
cp apps/api/.env.example apps/api/.env
npm run db:up      # Postgres 17 in Docker, bound to localhost
npm run db:migrate
```

Checks that CI runs on every push and PR:

```bash
npm run typecheck && npm run lint && npm run test && npm run build
```

## Where to edit

| What | File |
| --- | --- |
| Phone, WhatsApp number, address, hours, delivery, warranty, payment methods | `apps/web/src/lib/site.ts` |
| Products and departments (names, prices, specs, stock, photos) | `apps/web/src/lib/products.ts` (moves to the database and admin panel in Phase 1) |
| Product photos | `apps/web/public/images/` (then set `image: "/images/your-file.jpg"` on the product) |
| Logo / favicon | `apps/web/public/images/logo.png`, `apps/web/src/app/icon.png`, `apps/web/src/app/apple-icon.png` |
| Brand colours and fonts | `apps/web/src/app/globals.css` |
| WhatsApp order message format | `apps/web/src/lib/whatsapp.ts` |
| Database schema | `apps/api/prisma/schema.prisma` |

Anything still in `[brackets]` is a fact only the store can confirm (prices, warranty,
address, delivery times). Replace it, or set it to `""` in `site.ts` to hide that line.

`price: null` shows "Price on request"; set a number (USD) to show a price and totals.

## Pages

| Route | Page |
| --- | --- |
| `/` | Home |
| `/shop`, `/shop?q=search` | All products, with search, filters and sort |
| `/shop/[category]` | One department |
| `/product/[slug]` | Product page |
| `/cart` | Cart and checkout (sends the order to WhatsApp) |
| `/about` | About us |
| `/contact` | Contact, opening hours and delivery / payment / warranty FAQ |

## Adding more shadcn/ui components

`apps/web/components.json` is set up, so from `apps/web` you can run, for example:

```bash
npx shadcn@latest add dialog
```

New components pick up the brand colours from `globals.css` automatically.

## Deploy

The target is a single VPS running `web`, `api`, `postgres` and `caddy` with Docker Compose.
See Phase 6 in [`docs/backend-plan.md`](docs/backend-plan.md).
