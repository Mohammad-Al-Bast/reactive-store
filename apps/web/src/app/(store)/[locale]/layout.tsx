import type { Metadata } from "next";
import localFont from "next/font/local";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";

import { CartProvider } from "@/components/cart-provider";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { routing } from "@/i18n/routing";
import { getCategories } from "@/lib/catalog";
import { site } from "@/lib/site";
import "../../globals.css";

// Self-hosted variable fonts: no request to Google at build or run time.
const newsreader = localFont({
  src: "../../fonts/newsreader-latin-wght-normal.woff2",
  variable: "--font-newsreader",
  weight: "200 800",
  display: "swap",
});

const publicSans = localFont({
  src: "../../fonts/public-sans-latin-wght-normal.woff2",
  variable: "--font-public-sans",
  weight: "100 900",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${site.name} — Medical, Rehabilitation & Healthcare Supplies in Lebanon`,
    template: `%s — ${site.name}`,
  },
  description:
    "Physiotherapy, rehabilitation, massage, cupping and daily-living equipment for practitioners, students and families across Lebanon.",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function StoreLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  // The locale comes from the route, not request headers, so pages can be prerendered.
  setRequestLocale(locale);
  const categories = await getCategories(locale);

  return (
    <html lang={locale} dir="ltr" className={`${newsreader.variable} ${publicSans.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        <NextIntlClientProvider>
          <CartProvider>
            <a
              href="#main"
              className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-card focus:px-4 focus:py-2 focus:shadow"
            >
              Skip to content
            </a>
            <SiteHeader />
            <main id="main" className="flex-1">
              {children}
            </main>
            <SiteFooter categories={categories} />
          </CartProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
