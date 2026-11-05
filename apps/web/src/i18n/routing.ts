import { defineRouting } from "next-intl/routing";

/** Locales the store is served in: English at /en and Arabic (right-to-left) at /ar. */
export const routing = defineRouting({
  locales: ["en", "ar"],
  defaultLocale: "en",
  localePrefix: "always",
});

export type AppLocale = (typeof routing.locales)[number];

/** Text direction for a locale, for `<html dir>`. */
export function localeDir(locale: AppLocale) {
  return locale === "ar" ? "rtl" : "ltr";
}
