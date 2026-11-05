import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";

import ar from "../../messages/ar.json";
import en from "../../messages/en.json";
import { routing, type AppLocale } from "./routing";

// `satisfies` makes type-checking fail if ar.json is missing a key that en.json has.
const messages = { en, ar } satisfies Record<AppLocale, typeof en>;

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  return { locale, messages: messages[locale] };
});
