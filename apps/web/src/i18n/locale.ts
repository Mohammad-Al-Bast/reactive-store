import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { routing, type AppLocale } from "./routing";

/**
 * Reads the locale from a page's route params and registers it for next-intl.
 * Call it at the top of every store page and generateMetadata, so rendering
 * never falls back to request headers (which would stop prerendering).
 */
export async function pageLocale(params: Promise<{ locale: string }>): Promise<AppLocale> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  return locale;
}
