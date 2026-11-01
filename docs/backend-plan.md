# Reactive Store: backend, database, admin, Arabic and SEO

## Context

The site is currently a static Next.js 16 catalogue. Products and store info are hard-coded in `src/lib/products.ts` and `src/lib/site.ts`, the cart lives in `localStorage`, and orders and enquiries only exist as pre-filled WhatsApp messages. If a customer doesn't press send, the order is lost, and every product change needs a code edit and a redeploy.

The goal is a real store: orders saved in a database, an admin panel to run the shop, English and Arabic pages, and full SEO, all hosted on the owner's own server.

### Decisions
| Topic | Decision |
|---|---|
| Payment | Keep cash on delivery and Whish / OMT. Payment status is tracked in admin, with no gateway. |
| Languages | English and Arabic, at `/en` and `/ar`, with right-to-left layout for Arabic |
| Hosting | One VPS running Next.js, Postgres and Caddy with Docker Compose |
| Features | **Assumed, because the features question came back unanswered:** the basics plus guest order tracking. Accounts, reviews and discounts are left out of this version. |

### Stack
- **Database:** PostgreSQL 17 with Drizzle ORM and its migrations
- **Validation:** Zod, shared by forms and server actions
- **Admin login:** Better Auth with email and password. There are no customer accounts.
- **Languages:** `next-intl`
- **Email:** Nodemailer over SMTP, so the provider can be swapped
- **Images:** `sharp` converts uploads to WebP
- **Tests:** Vitest and Playwright (the repo has no tests today)

Stock stays as the existing three statuses (in stock, low stock, to order). There is no quantity counting, so nothing can go wrong with automatic deductions, and it can be added later.

## Phase 0: Prepare
- Commit the 7 content files applied from the desktop copy, which are still uncommitted, then work on a `feat/backend` branch.
- Add Docker Compose for local Postgres, `.env.example`, and the Drizzle config.

## Phase 1: Database and catalogue, deployed early
**Schema:**
- `categories`, `category_translations`
- `products`, `product_translations`, `product_images`, `product_related`
- `orders`, `order_items`, `order_status_history`
- `enquiries`
- Better Auth's tables

Details that matter:
- Translated text sits in the translation tables. `modes`, `inTheBox`, `specs` and `faq` are stored as JSONB.
- Products get a `status` of `draft` or `published`.
- `order_items` keeps a copy of the product name and price, so later edits don't change past orders.

**Seed script:** imports `src/lib/products.ts` into the database once. Any product still containing `[...]` placeholders becomes a **draft**, so placeholders can't reach customers.

**Data layer:** add `src/lib/catalog.ts` with async versions of the existing `getProduct`, `getCategory` and `productsIn` (`src/lib/products.ts`), wrapped in `'use cache'` and `cacheTag`. Keep the types, and update pages to `await` these.

**Cart:** `src/components/cart-provider.tsx` imports the catalogue directly in the browser, which can't work with a database.
- Keep storing only slug and quantity in `localStorage`.
- Add `POST /api/cart/resolve`, returning current name, price, image and stock.
- Keep the existing `ready` flag false until that returns.

**Deploy early:** put this phase on a staging subdomain on the VPS. This tests the riskiest constraint straight away: with `cacheComponents` on, `generateStaticParams` must return at least one param, so **the build needs database access**. Compose will build with `network: host`, the database bound to `127.0.0.1`, and the URL passed as a BuildKit secret.

## Phase 2: Orders, enquiries and tracking
- **`createOrder` server action**, replacing `onSubmit` in `src/components/checkout.tsx`:
  - Validate with Zod and recalculate all prices on the server. Browser prices are never trusted.
  - Keep "price on request" lines, with the total marked to be confirmed.
  - Move `makeOrderId` (`src/lib/whatsapp.ts`) to the server, using a secure random value and a unique constraint.
- **WhatsApp stays, but is no longer required:** the order is saved first, and `buildOrderMessage` is reused for the message. Browsers often block `window.open` after an `await`, so the success screen gets a clear "Send on WhatsApp" button instead of opening it automatically.
- **Store alerts:** an email for each new order. A failed email must not fail the order.
- **`createEnquiry`:** saves `EnquiryForm` submissions (`src/components/enquiry-form.tsx`), with the WhatsApp button kept.
- **`/track`:** order number plus phone number shows the status. Failed lookups give the same generic error, so it can't be used to discover orders.
- **Abuse protection:** rate limits on orders, enquiries, tracking and login (in-memory is fine on a single server), plus a hidden honeypot field on forms.

## Phase 3: Admin panel
Separate root layout at `/admin`, English only, with `noindex`, built from the existing shadcn/ui components. Every page **and every server action** checks the session.
- **Dashboard:** new orders and enquiries to follow up
- **Orders:** list, filter and search; change status (new → confirmed → out for delivery → delivered, or cancelled); payment status; internal notes; history of changes
- **Products and categories:** create, edit and publish in both languages, with stock status, price and related products. A warning shows if a required translation is missing or text contains `[...]`.
- **Images:** check type and size, convert with `sharp`, store on a persistent volume, and serve from Caddy at `/uploads`
- **Enquiries:** inbox with a handled/not handled status
- **Cache updates:** saving calls `updateTag`, so changes go live immediately without a redeploy

Store details in `src/lib/site.ts` stay in code for this version. They rarely change, and only the customer-facing wording moves to translation files.

## Phase 4: English and Arabic
- **Routes:** use `src/app/(store)/[locale]/...` and `src/app/(admin)/admin/...`. The `<html lang dir>` attributes move to the store layout, and `CartProvider` moves there too.
- **Strings:** move hard-coded text from all components and from `stockLabel`/`audienceLabel` into `messages/en.json` and `messages/ar.json`, including checkout errors.
- **Right-to-left:** switch to logical Tailwind classes (`ms-`, `ps-`, `text-start`) and mirror directional icons. Add a self-hosted Arabic font, matching how `layout.tsx` handles fonts today.
- **Locale-aware details:** `formatPrice` takes the locale, and the language switcher stays on the same page. Orders record the customer's language, and WhatsApp messages to the store stay in English.
- **Compatibility check:** `next-intl` must be tested with `cacheComponents` at the very start of this phase. The locale has to come from route params rather than headers, or caching breaks. If they conflict, fall back to simple JSON dictionaries loaded by locale.

## Phase 5: SEO
Most page titles exist already, but there is no `metadataBase`, sitemap, robots file, canonical URL, social sharing data or structured data.
- **Metadata:** `metadataBase`, canonical URLs, `hreflang` for en/ar/x-default, and Open Graph and Twitter data, all translated. Product pages use their photo, with a branded default image otherwise.
- **`src/app/sitemap.ts`:** generated from published products and categories, with language alternates. **`src/app/robots.ts`:** blocks `/admin`, `/cart`, `/track` and `/api`.
- **Structured data (JSON-LD):**
  - `Store` on the home and contact pages: address, hours, phone
  - `Product` with `Offer` on product pages, only when a price exists, because a price-less offer is invalid
  - `BreadcrumbList` on shop and product pages
- **Search and filter URLs:** `/shop?q=...` is `noindex` and canonicalises to `/shop`. The server-rendered product grid in `ProductGridFallback` keeps products visible to crawlers.
- **Content:** add visible breadcrumbs, one clear `h1` per page, descriptive image `alt` text, and unique category text.
- **Performance:** target good Core Web Vitals, using Lighthouse on mobile as the check. Lazy-load images and keep the client bundle small.

## Phase 6: Production launch
- **Server:** Ubuntu VPS with at least 4 GB RAM, because builds are memory-hungry. Firewall allows only SSH and web traffic, SSH keys only, automatic security updates.
- **Compose services:** `app` (`output: "standalone"`), `postgres` (not public), `caddy` (automatic HTTPS)
- **Deploy script:** migrate, build, restart, with the previous image kept for rollback
- **Backups:** nightly encrypted `pg_dump` and uploads copied **off the server**, with a restore tested before launch. Orders contain customer names, phones and addresses, so this isn't optional.
- **Monitoring:** uptime check and a disk-space alert
- **Pages:** privacy policy and terms, since the site now stores personal data
- **After launch:** submit the sitemap to Google Search Console, and set up a Google Business Profile for Shtoura, which is likely the biggest win for local search

## What the owner needs to provide
These don't block building, but they do block launch or limit SEO:
1. **VPS and domain:** the domain sets all canonical URLs and the sitemap
2. **Product details:** real values for the placeholders. Those products stay as drafts until then.
3. **Product photos:** only 2 of 14 products have one, which hurts both sales and search
4. **Arabic review:** I can draft the translation, but a fluent reader should check it, and someone qualified should check the **medical safety text** in particular
5. **Email account:** SMTP details for order alerts
6. **Privacy and terms review:** I can draft these, but they should be checked for Lebanese requirements

## Verification
- **Unit tests (Vitest):** server-side totals including "price on request", Zod schemas, phone number matching, order ID format
- **End-to-end (Playwright), in both languages:** browse → cart → checkout → order in the database → appears in admin → status change → shows on `/track`
- **Security checks:**
  - A tampered browser price is ignored
  - Admin pages and server actions are refused without login
  - Rate limits trigger
  - Draft products return 404 and are absent from the sitemap
- **Admin:** a price edit appears on the live page without a redeploy
- **Arabic:** visual pass in right-to-left at phone and desktop widths
- **SEO:** Google Rich Results Test on product and home pages, validate `sitemap.xml`, `robots.txt` and `hreflang`, and Lighthouse on mobile
- **Operations:** deploy from a clean server, restore a backup into an empty database, and roll back once
- **Every phase:** `npm run lint`, `npm run build` and the test suite pass
