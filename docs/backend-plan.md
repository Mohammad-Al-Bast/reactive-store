# Reactive Store: backend, database, admin, Arabic and SEO

## Context

The site is currently a static Next.js 16 catalogue. Products and store info are hard-coded in `src/lib/products.ts` and `src/lib/site.ts`, the cart lives in `localStorage`, and orders and enquiries only exist as pre-filled WhatsApp messages. If a customer doesn't press send, the order is lost, and every product change needs a code edit and a redeploy.

The goal is a real store: orders saved in a database, an admin panel to run the shop, English and Arabic pages, and full SEO, all hosted on the owner's own server.

### Decisions
| Topic | Decision |
|---|---|
| Payment | Keep cash on delivery and Whish / OMT. Payment status is tracked in admin, with no gateway. |
| Languages | English and Arabic, at `/en` and `/ar`, with right-to-left layout for Arabic |
| Features | **Basics only** (2026-11-05): orders, enquiries and the admin panel. No order-tracking page, customer accounts, reviews or discounts in this version. |
| i18n timing | **Locale routing early** (2026-11-05): routes move under `[locale]` with `next-intl` in Phase 1, English only. Arabic text and right-to-left come in Phase 4. |
| Backend | **Separate NestJS API** (2026-11-05), so other clients (a mobile app, automations) can use it later, and web and API can scale independently. |
| Repository | **Monorepo** (2026-11-05) with npm workspaces: `apps/web`, `apps/api`, `packages/shared`. Each app has its own Docker image and deploys on its own. |
| ORM | **Prisma** (2026-11-05) on PostgreSQL 17 |
| Admin auth | **JWT** (2026-11-05) in httpOnly cookies, with a short access token and rotating refresh tokens stored in the database |
| Hosting | One VPS running `web`, `admin`, `api`, `postgres` and `caddy` with Docker Compose |
| Admin site | **Separate app on its own subdomain** (2026-11-05): `apps/admin` at `admin.yourstore.com`, moved out of `apps/web`. The store and the panel deploy independently, admin cookies never reach the store's domain, and the API accepts admin requests only from `ADMIN_ORIGIN`. |

Decisions can change as we go. When one does, update this table with the date, then fix the phases below.

### Repository layout
```
apps/
  web/        Next.js 16 store (the current app, moved with git history)
  admin/      Next.js 16 admin panel, served at admin.yourstore.com
  api/        NestJS API
    prisma/   schema, migrations, seed
packages/
  shared/     Zod schemas, DTO types, enums (order status, stock, locales)
docker/       Dockerfiles, Caddyfile
docker-compose.yml
```
Turborepo (or Nx) can be added later for cached builds if CI gets slow. It's not needed at the start.

### Stack
- **Web (`apps/web`):** Next.js 16 with `cacheComponents`, `next-intl`, and the existing shadcn/ui components. It reads all data from the API and has no database access.
- **API (`apps/api`):** NestJS with Prisma and PostgreSQL 17
  - **Validation:** Zod schemas from `packages/shared`, applied in Nest with `nestjs-zod` and reused by the web forms
  - **Auth:** `@nestjs/jwt` and `passport-jwt`, `argon2` for password hashing. Admin users only, with no customer accounts.
  - **Rate limits:** `@nestjs/throttler`
  - **Email:** Nodemailer over SMTP, so the provider can be swapped
  - **Images:** `sharp` converts uploads to WebP
- **Proxy (`caddy`):** automatic HTTPS for two hosts. On each, `/api/*` goes to Nest and `/uploads/*` is served from disk. Everything else goes to the store (`yourstore.com`) or the admin app (`admin.yourstore.com`). Each site calls the API on its own origin, so cookies work without CORS and admin cookies stay on the admin host. `yourstore.com/admin` can redirect to the admin host.

  ```
  yourstore.com {
    handle /api/*     { reverse_proxy api:3001 }
    handle /uploads/* { root * /srv; file_server }
    handle /internal/* { respond 404 }
    redir /admin* https://admin.yourstore.com
    handle { reverse_proxy web:3000 }
  }
  admin.yourstore.com {
    handle /api/*     { reverse_proxy api:3001 }
    handle /uploads/* { root * /srv; file_server }
    handle { reverse_proxy admin:3002 }
  }
  ```
- **Tests:** Vitest everywhere (NestJS 12's default), supertest for API end-to-end, Playwright for the browser. The API lints with oxlint (also Nest 12's default), web keeps ESLint.

Stock stays as the existing three statuses (in stock, low stock, to order). There is no quantity counting, so nothing can go wrong with automatic deductions, and it can be added later.

### How web and API talk
- **Browser to API:** same-origin `fetch('/api/...')` through Caddy, on whichever site the page is on. The store uses it for the cart, checkout and enquiries; the admin site for sign-in and admin actions.
- **Next.js server to API:** an internal URL (`API_INTERNAL_URL=http://api:3001`) over the Docker network, wrapped in `'use cache'` and `cacheTag`.
- **API to Next.js (cache updates):** after an admin saves, Nest calls `POST http://web:3000/internal/revalidate` with a shared secret, and that route calls `revalidateTag` with immediate expiry. Caddy blocks `/internal/*` from the public.

## Phase 0: Prepare the monorepo
- Work on a `feat/backend` branch.
- Move the current app into `apps/web` with `git mv`, keeping its history. Add a root `package.json` with workspaces, and check that `lint`, `typecheck` and `build` still pass.
- Scaffold `apps/api` with the Nest CLI and Prisma, and create `packages/shared`.
- Add Docker Compose for local Postgres, and an `.env.example` for each app.
- **CI:** runs typecheck, lint, test and build across all workspaces (done in Phase 0). From Phase 1 the web build needs a running API (see "Deploy early"), so Phase 1 adds a `postgres:17` service to CI: run `prisma migrate deploy`, seed, start the API, then build web.

## Phase 1: Database, catalogue API and locale routing, deployed early
**Prisma schema:**
- `Category`, `CategoryTranslation`
- `Product`, `ProductTranslation`, `ProductImage`, `ProductRelated`
- `Order`, `OrderItem`, `OrderStatusHistory`
- `Enquiry`
- `AdminUser`, `RefreshToken`

Details that matter:
- Translated text sits in the translation tables. `modes`, `inTheBox`, `specs` and `faq` are stored as `Json` (JSONB).
- Products get a `status` of `draft` or `published`.
- `OrderItem` keeps a copy of the product name and price, so later edits don't change past orders.

**Seed script (`prisma/seed.ts`):** imports the current catalogue (copied from `src/lib/products.ts`) once. Any product with bracketed placeholder text (`/\[[^\]]+\]/`, which catches `[X]`, `[confirm]`, `[kg — confirm]` and so on) in any field becomes a **draft**, so placeholders can't reach customers. Today that is most of the catalogue, and 12 of 14 products have no price ("price on request").

**Catalogue API (public, published items only):** `GET /api/categories`, `GET /api/products?category=&locale=`, `GET /api/products/:slug?locale=`, and `POST /api/cart/resolve`.

**Web data layer:** `apps/web/src/lib/catalog.ts` has async versions of the existing `getProduct`, `getCategory` and `productsIn` that call the API. The response types come from `packages/shared`, and pages are updated to `await` these.

**Cart:** `cart-provider.tsx` imports the catalogue directly in the browser, which can't work with a database.
- Keep storing only slug and quantity in `localStorage`.
- Call `POST /api/cart/resolve` for the current name, price, image and stock.
- Keep the existing `ready` flag false until that returns.

**Locale routing (English only):** move store pages to `app/(store)/[locale]/...` with `next-intl`, routing in `src/proxy.ts` (Next 16 renamed `middleware.ts` to `proxy.ts`). Move `<html lang dir>`, fonts and `CartProvider` from the root layout into the store layout. Only `en` is enabled for now. **Test this with `cacheComponents` first:** the locale must come from route params (`setRequestLocale`), not headers. If they conflict, fall back to plain JSON dictionaries loaded by locale. Text stays hard-coded until Phase 4.

**Deploy early:** put this phase on a staging subdomain on the VPS. This tests the riskiest constraint straight away: with `cacheComponents` on, `generateStaticParams` must return at least one param, so **the web build needs the API, and the API needs the database**. The deploy script brings up `postgres` and `api` first, then builds `web` with `API_INTERNAL_URL` pointing at the running API.

**Progress (2026-11-05):** schema, migration, seed, catalogue API, web data layer, cart resolve and `[locale]` routing are done. Still to do: the staging deploy.
- `next-intl` works with `cacheComponents`: the locale comes from route params via `setRequestLocale`, and every page prerenders. No JSON-dictionary fallback was needed.
- The seed published 5 of 14 products. The other 9 still have `[placeholder]` text and are drafts.
- A slug that isn't prerendered (a draft or unknown product) streams the not-found page with `noindex`, but with HTTP status 200, because the status is sent before `notFound()` runs. Revisit in Phase 5 if search engines need a real 404.

## Phase 2: Orders and enquiries
- **`POST /api/orders`**, called from `checkout.tsx` in place of its current `onSubmit`:
  - Validate with the shared Zod schema and recalculate all prices on the server. Browser prices are never trusted.
  - Keep "price on request" lines, with the total marked to be confirmed.
  - Move `makeOrderId` (`src/lib/whatsapp.ts`) to the API, using a secure random value and a unique constraint.
  - Save the order and its first status-history row in one Prisma transaction.
- **WhatsApp stays, but is no longer required:** the order is saved first, and `buildOrderMessage` (moved to `packages/shared`) is reused for the message. Browsers often block `window.open` after an `await`, so the success screen gets a clear "Send on WhatsApp" button instead of opening it automatically.
- **Store alerts:** an email for each new order, sent after the transaction commits. A failed email must not fail the order.
- **`POST /api/enquiries`:** saves `EnquiryForm` submissions (`enquiry-form.tsx`), with the WhatsApp button kept.
- **Abuse protection:** `@nestjs/throttler` limits on orders, enquiries and admin login. In-memory storage is fine on a single API instance; move it to Redis if the API is ever scaled out. Forms also get a hidden honeypot field.

**Progress (2026-11-05):** done.
- `POST /api/orders` merges repeated items, prices every line from the database, and refuses unavailable items with a 422 that lists them (the cart then drops them). Order numbers look like `RS-261105-K3QZ7W`: the date in Lebanon plus 6 random characters from `crypto.randomInt`. The order is saved with a retry if the number is already taken.
- Form schemas, governorates, enquiry role and topic ids, and the message builders live in `packages/shared`. The browser validates with the same schemas as the API.
- The API also refuses POSTs whose `Origin` isn't `WEB_ORIGIN`.
- Enquiries send alerts too, not only orders. Until the admin panel exists, alerts are the only way the store sees them.
- Alerts (Telegram and email) go through an outbox; see "Staff alerts" below. Each channel stays off until its env vars are set, and the API logs which channels are on at startup.

### Staff alerts (added 2026-11-05)
The store wanted a phone alert for each new order. We chose a **Telegram bot** for now: it's free and needs no approval. The WhatsApp Cloud API needs a Meta Business account, a second sender number and an approved message template, so it can come later as another channel. Unofficial WhatsApp libraries were ruled out because they can get the store's number banned.

- **Outbox:** alerts are rows in a `Notification` table, written in the same transaction as the order or enquiry. A sender inside the API delivers them every 5 seconds, and straight after each commit. It claims each row before sending, so two API instances never send twice, and it frees rows left stuck in `sending` after a crash.
- **Retries:** 8 attempts with growing delays (30s up to 1h), and it respects Telegram's `retry_after`. Errors that retrying can't fix (bad token, unknown chat, bot blocked) fail at once. Email alerts use the same path.
- **Config:** `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_IDS`, and `ADMIN_URL` for the "Open in dashboard" link. `npm run telegram:setup` finds chat ids.
- **Phase 3:** show each order's alert status in the admin panel, with a resend button. Add WhatsApp Cloud API as a channel whenever the Meta setup is ready.

## Phase 3: Admin auth and admin panel
**Auth (in the API):**
- `POST /api/auth/login` checks email and password (`argon2`) and sets two **httpOnly, Secure, SameSite=Lax** cookies:
  - an access JWT that lasts 15 minutes
  - a refresh token that lasts 7–30 days, scoped to `/api/auth`
- `POST /api/auth/refresh` **rotates** the refresh token. Only its hash is stored in `RefreshToken`. If an old token is used again, all of that user's sessions are revoked.
- `POST /api/auth/logout` revokes the current refresh token, and there is a "sign out everywhere" action. Storing refresh tokens is what makes JWT logout real.
- A global `JwtAuthGuard` protects every `/api/admin/*` route. Tokens never go in `localStorage`.
- The first admin is created by a CLI seed command. There is no public sign-up.
- Mutating requests are protected from CSRF by `SameSite` cookies plus an `Origin` header check.

**Admin UI (`apps/admin`, its own site since 2026-11-05):** English only, `noindex` (header, metadata and `robots.txt`), built from the same shadcn/ui components. `proxy.ts` redirects to `/login` when the cookie is missing. That's only for user experience: **the API guard is the real check.** Admin pages are dynamic, and when they fetch on the server they forward the cookie to the API.
- **Dashboard:** new orders and enquiries to follow up
- **Orders:** list, filter and search; change status (new → confirmed → out for delivery → delivered, or cancelled); payment status; internal notes; history of changes
- **Products and categories:** create, edit and publish in both languages, with stock status, price and related products. A warning shows if a required translation is missing or text contains `[...]`.
- **Images:** upload to the API, which checks type and size, converts with `sharp`, and stores on a persistent volume that Caddy serves at `/uploads`
- **Enquiries:** inbox with a handled/not handled status
- **Cache updates:** after each save, the API calls the web revalidate route, so changes go live immediately without a redeploy

Store details in `src/lib/site.ts` stay in code for this version. They rarely change, and only the customer-facing wording moves to translation files.

**Progress (2026-11-05):** done, in four commits (auth, admin API, admin UI for orders and enquiries, catalogue editing).
- **Auth** is as planned, with one difference: a small guard built on `@nestjs/jwt` instead of `passport-jwt`. The guard also checks in the database that the session is still live, so signing out, "sign out everywhere", changing a password and disabling an admin all apply at once, not up to 15 minutes later. A rotated refresh token reused within 30 seconds is treated as two tabs refreshing at once and doesn't revoke sessions. `npm run admin` creates and manages admins.
- **Order status** follows `orderStatusTransitions` in `packages/shared`: forward through the flow, cancel before delivery, and one step back to fix a mistake. Payment changes and internal notes are history entries naming the admin. If two admins change the same order at once, the second gets a 409.
- **Catalogue editor:** English plus an optional Arabic translation per product and department. Publishing is refused while any `[...]` text remains. Photos are converted to WebP (max 1600px, metadata stripped) and stored under `UPLOAD_DIR`.
- **Live updates:** after each save the API calls `/internal/revalidate`, which expires the `catalog` cache tag and immediately re-requests the affected pages. Next serves one stale render after expiry, so without this the admin's first "View in store" would show the old version. A price edit showed on the live page about 2 seconds after saving.
- Each order page shows its staff-alert status, with a resend button.
- Still open: Playwright browser tests (planned in Verification) and a review of the panel on a phone.

## Phase 4: English and Arabic
- **Routes:** already under `[locale]` since Phase 1. Enable `ar` in the `next-intl` routing config.
- **Strings:** move hard-coded text from all components and from `stockLabel`/`audienceLabel` into `messages/en.json` and `messages/ar.json`, including checkout errors. API validation errors return codes, and the web app translates them.
- **Right-to-left:** switch to logical Tailwind classes (`ms-`, `ps-`, `text-start`) and mirror directional icons. Add a self-hosted Arabic font, matching how `layout.tsx` handles fonts today.
- **Locale-aware details:** `formatPrice` takes the locale, and the language switcher stays on the same page. Orders record the customer's language, and WhatsApp messages to the store stay in English.

**Progress (2026-11-05):** first pass done, in two commits (shared error codes and English order lines, then the bilingual store).
- **Arabic tone:** written in Lebanese dialect (e.g. «ضيف عالسلّة», «شو بدّك؟», «منتّصل فيك») rather than formal Arabic; brand and device names (TENS, Whish / OMT) stay in English.
- **Strings:** all store text is in `apps/web/messages/{en,ar}.json`, including store wording that was in `site.ts` (address, hours, delivery and payment text); `site.ts` now keeps only facts (phone, email, links, numbers). Message keys are typed, and `ar.json` missing a key fails type-checking.
- **Validation:** the public order and enquiry schemas in `packages/shared` return codes (`name_required`, `phone_invalid`, …), which the store translates under `Errors`.
- **Prices:** USD with Western digits ("$70") in both languages, as Lebanese shops write them; only "price on request" is translated. `formatPrice` takes that label rather than the locale.
- **RTL:** `<html dir>` follows the locale; logical classes (`ms-`, `ps-`, `start-`, `text-start`), forward arrows mirrored, the menu sheet opens from the end side. Phone and order numbers are isolated as left-to-right. Arabic fonts: Markazi Text (headings, a Naskh that pairs with the Newsreader serif) and IBM Plex Sans Arabic (text, matches Public Sans), self-hosted, loaded only for Arabic text.
- **English for staff:** order lines are saved with English product names, and WhatsApp messages (order, enquiry, product question) are English whatever the customer's language. Orders and enquiries still record the customer's locale.
- **Language switcher** in the top bar and mobile menu, staying on the same page (search terms are dropped).
- Still open: Arabic catalogue content (department and product translations are entered in the admin panel; until then they fall back to English), a native-speaker review of the copy, and a check on a phone.

## Phase 5: SEO
Most page titles exist already, but there is no `metadataBase`, sitemap, robots file, canonical URL, social sharing data or structured data.
- **Metadata:** `metadataBase`, canonical URLs, `hreflang` for en/ar/x-default, and Open Graph and Twitter data, all translated. Product pages use their photo, with a branded default image otherwise.
- **`app/sitemap.ts`:** generated from published products and categories (from the API), with language alternates. **`app/robots.ts`:** blocks `/admin`, `/cart`, `/api` and `/internal`.
- **Structured data (JSON-LD):**
  - `Store` on the home and contact pages: address, hours, phone
  - `Product` with `Offer` on product pages, only when a price exists, because a price-less offer is invalid. Today only 2 of 14 products have a price, so adding prices is also an SEO win.
  - `BreadcrumbList` on shop and product pages
- **Search and filter URLs:** `/shop?q=...` is `noindex` and canonicalises to `/shop`. The server-rendered product grid in `ProductGridFallback` keeps products visible to crawlers.
- **Content:** add visible breadcrumbs, one clear `h1` per page, descriptive image `alt` text, and unique category text.
- **Performance:** target good Core Web Vitals, using Lighthouse on mobile as the check. Lazy-load images and keep the client bundle small.

## Phase 6: Production launch
- **Server:** Ubuntu VPS with at least 4 GB RAM, because builds are memory-hungry. Firewall allows only SSH and web traffic, SSH keys only, automatic security updates.
- **Compose services:**
  - `web`: the store, Next.js with `output: "standalone"`
  - `admin`: the admin panel, same as `web`, built with `NEXT_PUBLIC_STORE_URL`
  - `api`: NestJS
  - `postgres`: not public
  - `caddy`: automatic HTTPS and routing
  - Only Caddy publishes ports.
- **Deploy script:** `prisma migrate deploy`, then build and restart the API, then build and restart web and admin, with the previous images kept for rollback
- **Production env for the separate admin site:** `WEB_ORIGIN=https://yourstore.com`, `ADMIN_ORIGIN=https://admin.yourstore.com`, `ADMIN_URL=https://admin.yourstore.com`, `COOKIE_SECURE=true`
- **Backups:** nightly encrypted `pg_dump` and uploads copied **off the server**, with a restore tested before launch. Orders contain customer names, phones and addresses, so this isn't optional.
- **Monitoring:** uptime checks for web and the API health endpoint (`/api/health`), plus a disk-space alert
- **Pages:** privacy policy and terms, since the site now stores personal data
- **After launch:** submit the sitemap to Google Search Console, and set up a Google Business Profile for Shtoura, which is likely the biggest win for local search
- **Scaling later:** the API is stateless (JWT plus refresh tokens in Postgres), so more `api` containers can run behind Caddy once the rate limiter moves to Redis. Web can scale the same way.

## What the owner needs to provide
These don't block building, but they do block launch or limit SEO:
1. **VPS and domain:** the domain sets all canonical URLs and the sitemap. Point both `yourstore.com` and `admin.yourstore.com` at the server.
2. **Product details:** real values for the placeholders. Those products stay as drafts until then.
3. **Product photos:** only 2 of 14 products have one, which hurts both sales and search
4. **Arabic review:** I can draft the translation, but a fluent reader should check it, and someone qualified should check the **medical safety text** in particular
5. **Email account (optional):** SMTP details, if you also want alerts by email
6. **Privacy and terms review:** I can draft these, but they should be checked for Lebanese requirements
7. **Telegram alerts for new orders** (about 5 minutes; the code is ready):
   - [ ] In Telegram, message **@BotFather**, send `/newbot` and follow the steps. Put the token it gives you into `TELEGRAM_BOT_TOKEN` in `apps/api/.env`, and keep it private: anyone with it can post as your bot.
   - [ ] Open your new bot and send it any message. For a shared chat, add the bot to a staff group and send a message there.
   - [ ] Run `npm run telegram:setup -w @reactive-store/api` to list the chat ids that messaged the bot.
   - [ ] Put the ids you want into `TELEGRAM_CHAT_IDS` (comma-separated), then send a test: `npm run telegram:setup -w @reactive-store/api -- <id>`.
   - [ ] Restart the API and check its log says `telegram alerts on, to N recipient(s)`. Place a test order and check that the alert arrives.
   - [ ] Once the site has a domain, set `ADMIN_URL` (e.g. `https://admin.yourstore.com`) so alerts link to the order.
   - [ ] On the server, put the same `TELEGRAM_*` values in the production env.

## Verification
- **API unit tests (Vitest):** server-side totals including "price on request", order ID format, refresh-token rotation and reuse detection
- **Shared (Vitest):** Zod schemas, phone number matching
- **API end-to-end (supertest against a test database):** order creation, a tampered price being ignored, admin routes returning 401 without a token, and rate limits triggering
- **End-to-end (Playwright), in both languages:** browse → cart → checkout → order in the database → appears in admin → status change recorded in history
- **Security checks:**
  - A tampered browser price is ignored
  - Admin pages and every admin API route are refused without login
  - An expired access token is refreshed, and a reused refresh token revokes the session
  - Rate limits trigger
  - `/internal/revalidate` is unreachable from the public internet
  - Draft products return 404 and are absent from the sitemap
- **Admin:** a price edit appears on the live page without a redeploy
- **Arabic:** visual pass in right-to-left at phone and desktop widths
- **SEO:** Google Rich Results Test on product and home pages, validate `sitemap.xml`, `robots.txt` and `hreflang`, and Lighthouse on mobile
- **Operations:** deploy from a clean server, restore a backup into an empty database, and roll back once
- **Every phase:** lint, typecheck, build and the test suites pass for every workspace
