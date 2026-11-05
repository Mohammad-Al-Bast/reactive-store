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

// Arabic: each Latin font falls back to these for Arabic letters (see globals.css).
// The unicode-range means they are only downloaded when a page has Arabic text, so
// English pages don't pay for them; `preload` is off for the same reason.
// (Font loader options must be literals, so the range is repeated.)

const notoNaskhArabic = localFont({
  src: "../../fonts/noto-naskh-arabic-arabic-wght-normal.woff2",
  variable: "--font-noto-naskh-arabic",
  weight: "400 700",
  display: "swap",
  preload: false,
  declarations: [{ prop: "unicode-range", value: "U+0600-06FF, U+0750-077F, U+0870-08FF, U+FB50-FDFF, U+FE70-FEFF, U+200C-200F" }],
});

const notoSansArabic = localFont({
  src: "../../fonts/noto-sans-arabic-arabic-wght-normal.woff2",
  variable: "--font-noto-sans-arabic",
  weight: "100 900",
  display: "swap",
  preload: false,
  declarations: [{ prop: "unicode-range", value: "U+0600-06FF, U+0750-077F, U+0870-08FF, U+FB50-FDFF, U+FE70-FEFF, U+200C-200F" }],
});

const fontVariables = [newsreader, publicSans, notoNaskhArabic, notoSansArabic].map((f) => f.variable).join(" ");

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
