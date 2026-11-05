# Reactive Store

Online store for Reactive Store — medical, rehabilitation and healthcare supplies in Lebanon.

A monorepo with npm workspaces. The backend is being built in phases; see
[`docs/backend-plan.md`](docs/backend-plan.md) for the plan and the decisions behind it.

| Workspace | What |
| --- | --- |
| `apps/web` | The store. Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · shadcn/ui (Radix) · lucide icons |
| `apps/admin` | The admin panel, a separate site for `admin.yourstore.com`. Same stack as the store. |
| `apps/api` | REST API under `/api`. NestJS 12 · Prisma 7 · PostgreSQL 17 |
| `packages/shared` | Zod schemas, enums and types used by both apps |

Orders and enquiries are saved in the database, and staff get an alert on Telegram (and by
email, if configured). Customers can also send their order on WhatsApp from the confirmation
screen, but they don't have to.

## Run it

Requires Node.js 22+ (24 recommended). Docker is needed for the local database.

The web app reads every product from the API, so start the database and API first.

```bash
npm install
cp apps/api/.env.example apps/api/.env
npm run db:up      # Postgres 17 in Docker, on localhost:5433
npm run db:migrate # create the tables
npm run db:seed    # import the starting catalogue (safe to re-run)

npm run dev        # API, store and admin together, in one terminal:
                   #   API    http://localhost:3001/api/health
                   #   store  http://localhost:3000 (redirects to /en)
                   #   admin  http://localhost:3002
```

To run one on its own: `npm run dev:api`, `npm run dev:web` or `npm run dev:admin`.

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
| Products, departments, prices, stock, photos | The admin panel (Products, Departments). Changes are live on the store within seconds. |
| Product photos | Upload them on the product's page in the admin panel. They are converted to WebP and stored in `UPLOAD_DIR`. |
| Logo / favicon | `apps/web/public/images/logo.png`, `apps/web/src/app/icon.png`, `apps/web/src/app/apple-icon.png` |
| Brand colours and fonts | `apps/web/src/app/globals.css` |
| Order and enquiry message format (WhatsApp and email alerts) | `packages/shared/src/messages.ts` |
| Enquiry form roles and topics | ids in `packages/shared/src/forms.ts`, labels in `apps/web/src/lib/whatsapp.ts` |
| Staff alerts (Telegram, email), rate limits | `TELEGRAM_*`, `SMTP_*`, `ORDER_ALERT_TO` and `SUBMIT_RATE_LIMIT` in `apps/api/.env` (see below) |
| Alert wording | `apps/api/src/notifications/alerts.ts` |
| Database schema | `apps/api/prisma/schema.prisma` |

Anything still in `[brackets]` is a fact only the store can confirm (prices, warranty,
address, delivery times). Replace it, or set it to `""` in `site.ts` to hide that line.

`price: null` shows "Price on request"; set a number (USD) to show a price and totals.

Products with `[bracketed]` text were imported as **drafts** and are hidden from the store.
Fill in the details in the admin panel and set them to Published. The panel won't publish a
product while it still has bracketed text.

## Pages

Every store page lives under a locale prefix (`/en` today, `/ar` from Phase 4). Paths
without one, such as `/shop`, redirect to `/en/shop`.

| Route | Page |
| --- | --- |
| `/en` | Home |
| `/en/shop`, `/en/shop?q=search` | All products, with search, filters and sort |
| `/en/shop/[category]` | One department |
| `/en/product/[slug]` | Product page |
| `/en/cart` | Cart and checkout (saves the order; WhatsApp is optional) |
| `/en/about` | About us |
| `/en/contact` | Contact, opening hours and delivery / payment / warranty FAQ |

The admin panel is its own site (`apps/admin`, http://localhost:3002 locally,
`admin.yourstore.com` in production). It is English only and never indexed: dashboard,
orders, enquiries, products and departments. See "Admin accounts" below to create a login.
Its sign-in cookies belong to the admin site only, and the API accepts sign-in and admin
requests only from `ADMIN_ORIGIN`, so the store can't act on an admin's behalf.

For admin edits to show on the store at once, set the same random `REVALIDATE_SECRET` in
`apps/api/.env` and `apps/web/.env.local`. Without it, the store picks up changes within an hour.

API routes (all under `/api`): `GET /health`, `GET /categories`, `GET /products?category=&locale=`,
`GET /products/:slug?locale=`, `POST /cart/resolve`, `POST /orders`, `POST /enquiries`,
`/auth/*` (sign-in), and `/admin/*` (signed-in admins only).
The two form endpoints are rate limited per IP and refuse POSTs from other websites.

## Admin accounts

There is no public sign-up. Create admins from the command line (the password is asked for
without being shown):

```bash
npm run admin -w @reactive-store/api -- create you@example.com "Your Name"
npm run admin -w @reactive-store/api -- password you@example.com   # change it, signs out everywhere
npm run admin -w @reactive-store/api -- disable  you@example.com   # and enable
npm run admin -w @reactive-store/api -- list
```

Set `JWT_SECRET` in `apps/api/.env` (the API refuses to start in production without it).
Sessions use httpOnly cookies: a 15-minute access token and a 30-day refresh token that is
replaced on every use. Signing out, changing a password or disabling an admin takes effect
immediately.

## New-order alerts on Telegram

Every new order and enquiry sends a message to staff on Telegram. To set it up:

1. In Telegram, message **@BotFather**, send `/newbot`, and follow the steps. Copy the token
   it gives you into `TELEGRAM_BOT_TOKEN` in `apps/api/.env`.
2. Open your new bot and send it any message. For a shared alert chat, add the bot to a staff
   group and send a message there.
3. Run `npm run telegram:setup -w @reactive-store/api` to list the chat ids that messaged the bot.
4. Put the ids into `TELEGRAM_CHAT_IDS` (comma-separated), then send a test with
   `npm run telegram:setup -w @reactive-store/api -- <id>`.
5. Restart the API. Its log should say `telegram alerts on, to N recipient(s)`.

Alerts are saved with the order in the same database transaction, then sent in the
background. If Telegram is down, they retry for about 2 hours; a wrong token or chat id
fails at once and is logged. Each alert's status is in the `Notification` table.

## Adding more shadcn/ui components

`apps/web/components.json` is set up, so from `apps/web` you can run, for example:

```bash
npx shadcn@latest add dialog
```

New components pick up the brand colours from `globals.css` automatically.

## Deploy

The target is a single VPS running `web`, `api`, `postgres` and `caddy` with Docker Compose.
See Phase 6 in [`docs/backend-plan.md`](docs/backend-plan.md).
