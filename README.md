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

The web app reads every product from the API, so start the database and API first.

```bash
npm install
cp apps/api/.env.example apps/api/.env
npm run db:up      # Postgres 17 in Docker, on localhost:5433
npm run db:migrate # create the tables
npm run db:seed    # import the starting catalogue (safe to re-run)

npm run dev:api    # API at http://localhost:3001/api/health
npm run dev        # web at http://localhost:3000 (redirects to /en)
```

Docker Desktop must be running for `db:up`. The container uses port 5433 so it doesn't
clash with a locally installed Postgres; set `POSTGRES_PORT` to change it.

Checks that CI runs on every push and PR (the web build needs the API running):

```bash
npm run typecheck && npm run lint && npm run test
npm run test:e2e -w @reactive-store/api   # needs the seeded database
npm run build                              # needs the API on :3001
```

## Where to edit

| What | File |
| --- | --- |
| Phone, WhatsApp number, address, hours, delivery, warranty, payment methods | `apps/web/src/lib/site.ts` |
| Products and departments (names, prices, specs, stock, photos) | The database. Edited in the admin panel from Phase 3; until then, in the database directly (`npx prisma studio` in `apps/api`). The starting catalogue is `apps/api/prisma/seed-data.ts`. |
| Product photos | `apps/web/public/images/` (then add a `ProductImage` row with `url: "/images/your-file.jpg"`) |
| Logo / favicon | `apps/web/public/images/logo.png`, `apps/web/src/app/icon.png`, `apps/web/src/app/apple-icon.png` |
| Brand colours and fonts | `apps/web/src/app/globals.css` |
| WhatsApp order message format | `apps/web/src/lib/whatsapp.ts` |
| Database schema | `apps/api/prisma/schema.prisma` |

Anything still in `[brackets]` is a fact only the store can confirm (prices, warranty,
address, delivery times). Replace it, or set it to `""` in `site.ts` to hide that line.

`price: null` shows "Price on request"; set a number (USD) to show a price and totals.

Products with `[bracketed]` text were imported as **drafts** and are hidden from the store.
Fill in the details and set `status` to `published` to show them.

## Pages

Every store page lives under a locale prefix (`/en` today, `/ar` from Phase 4). Paths
without one, such as `/shop`, redirect to `/en/shop`.

| Route | Page |
| --- | --- |
| `/en` | Home |
| `/en/shop`, `/en/shop?q=search` | All products, with search, filters and sort |
| `/en/shop/[category]` | One department |
| `/en/product/[slug]` | Product page |
| `/en/cart` | Cart and checkout (sends the order to WhatsApp) |
| `/en/about` | About us |
| `/en/contact` | Contact, opening hours and delivery / payment / warranty FAQ |

API routes (all under `/api`): `GET /health`, `GET /categories`, `GET /products?category=&locale=`,
`GET /products/:slug?locale=`, `POST /cart/resolve`.

## Adding more shadcn/ui components

`apps/web/components.json` is set up, so from `apps/web` you can run, for example:

```bash
npx shadcn@latest add dialog
```

New components pick up the brand colours from `globals.css` automatically.

## Deploy

The target is a single VPS running `web`, `api`, `postgres` and `caddy` with Docker Compose.
See Phase 6 in [`docs/backend-plan.md`](docs/backend-plan.md).
