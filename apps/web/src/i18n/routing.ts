import { defineRouting } from "next-intl/routing";

/**
 * Locales the store is served in. Only English is enabled for now; Arabic
 * (`ar`, already in packages/shared) is switched on in Phase 4.
 */
export const routing = defineRouting({
  locales: ["en"],
  defaultLocale: "en",
  localePrefix: "always",
});

export type AppLocale = (typeof routing.locales)[number];
