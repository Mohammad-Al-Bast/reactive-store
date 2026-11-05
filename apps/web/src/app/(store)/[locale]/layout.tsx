import type { Metadata } from "next";
import localFont from "next/font/local";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { CartProvider } from "@/components/cart-provider";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { pageLocale } from "@/i18n/locale";
import { localeDir, routing } from "@/i18n/routing";
import { getCategories } from "@/lib/catalog";
import { site } from "@/lib/site";
import "../../globals.css";

// Self-hosted variable fonts: no request to Google at build or run time.
// Fraunces (headings) carries its optical-size axis, so large headings get the display cut.
const fraunces = localFont({
  src: "../../fonts/fraunces-latin-opsz-normal.woff2",
  variable: "--font-fraunces",
  weight: "100 900",
  display: "swap",
});

const dmSans = localFont({
  src: "../../fonts/dm-sans-latin-wght-normal.woff2",
  variable: "--font-dm-sans",
  weight: "100 1000",
  display: "swap",
});

// Arabic: each Latin font falls back to these for Arabic letters (see globals.css).
// Markazi Text (headings) is a Naskh drawn to sit beside Latin serifs like Fraunces;
// IBM Plex Sans Arabic is the text face. The unicode-range means they are
// only downloaded when a page has Arabic text, so English pages don't pay for them;
// `preload` is off for the same reason. (Font loader options must be literals.)
const markaziText = localFont({
  src: "../../fonts/markazi-text-arabic-wght-normal.woff2",
  variable: "--font-markazi-text",
  weight: "400 700",
  display: "swap",
  preload: false,
  declarations: [{ prop: "unicode-range", value: "U+0600-06FF, U+0750-077F, U+0870-08FF, U+FB50-FDFF, U+FE70-FEFF, U+200C-200F" }],
});

// Plex Arabic isn't a variable font: one file per weight the store uses.
const plexSansArabic = localFont({
  src: [
    { path: "../../fonts/ibm-plex-sans-arabic-arabic-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../../fonts/ibm-plex-sans-arabic-arabic-500-normal.woff2", weight: "500", style: "normal" },
    { path: "../../fonts/ibm-plex-sans-arabic-arabic-600-normal.woff2", weight: "600", style: "normal" },
    { path: "../../fonts/ibm-plex-sans-arabic-arabic-700-normal.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-plex-sans-arabic",
  display: "swap",
  preload: false,
  declarations: [{ prop: "unicode-range", value: "U+0600-06FF, U+0750-077F, U+0870-08FF, U+FB50-FDFF, U+FE70-FEFF, U+200C-200F" }],
});

const fontVariables = [fraunces, dmSans, markaziText, plexSansArabic].map((f) => f.variable).join(" ");

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return {
    title: { default: t("title", { store: site.name }), template: `%s — ${site.name}` },
    description: t("description"),
  };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function StoreLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  // The locale comes from the route, not request headers, so pages can be prerendered.
  setRequestLocale(locale);
  const [categories, t] = await Promise.all([getCategories(locale), getTranslations({ locale, namespace: "Common" })]);

  return (
    <html lang={locale} dir={localeDir(locale)} className={`${fontVariables} h-full`}>
      <body className="flex min-h-full flex-col">
        <NextIntlClientProvider>
          <CartProvider>
            <a
              href="#main"
              className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-card focus:px-4 focus:py-2 focus:shadow"
            >
              {t("skipToContent")}
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
