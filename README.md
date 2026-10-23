# Reactive Store

Online store for Reactive Store — medical, rehabilitation and healthcare supplies in Lebanon.

Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · shadcn/ui (Radix) · lucide icons.
Orders and enquiries are sent to the store's WhatsApp, so no server or payment setup is needed yet.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000.

For a production build: `npm run build` then `npm start`.

## Where to edit

| What | File |
| --- | --- |
| Phone, WhatsApp number, address, hours, delivery, warranty, payment methods | `src/lib/site.ts` |
| Products and departments (names, prices, specs, stock, photos) | `src/lib/products.ts` |
| Product photos | `public/images/` (then set `image: "/images/your-file.jpg"` on the product) |
| Logo / favicon | `public/images/logo.png`, `src/app/icon.png`, `src/app/apple-icon.png` |
| Brand colours and fonts | `src/app/globals.css` |
| WhatsApp order message format | `src/lib/whatsapp.ts` |

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

## How ordering works

1. The cart is saved in the visitor's browser (`localStorage`).
2. At checkout the customer fills in delivery details and a payment method.
3. "Send order on WhatsApp" opens WhatsApp with the full order pre-written to the store number.
   The customer presses send; the store confirms the total and delivery by phone.

To move to real online orders later, replace `onSubmit` in `src/components/checkout.tsx`
with a call to an API route that saves the order (and keep WhatsApp as a notification).

## Adding more shadcn/ui components

`components.json` is set up, so you can run, for example:

```bash
npx shadcn@latest add dialog
```

New components pick up the brand colours from `globals.css` automatically.

## Deploy

Push to GitHub and import the repo on Vercel (free tier is enough), or run `npm run build`
and host the output on any Node.js server.
