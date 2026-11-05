import { formatUsd, governorates, paymentMethodSchema } from "@reactive-store/shared";

/**
 * Store-wide facts: contact details, numbers and links. Customer-facing wording
 * (tagline, address, opening hours, delivery and payment text) is translated, so
 * it lives in messages/en.json and messages/ar.json under "Site".
 */
export const site = {
  name: "Reactive Store",
  yearsInField: 5,

  phoneDisplay: "81 164 065",
  /** International format, digits only — used for tel: and WhatsApp links. */
  phoneIntl: "96181164065",
  email: "reactive.medicalservices.lb@gmail.com",
  mapUrl: "https://maps.app.goo.gl/Rcuwrb2Fpk81uRn88",
  /** Keys under "Site.hours" in the message files, in display order. */
  hours: ["weekdays", "saturday", "sunday"],
  customersServed: "2,500+",

  social: {
    instagram: "", // e.g. "https://instagram.com/reactivestore"
    facebook: "",
  },

  /** Names and descriptions are under "Site.payment" in the message files. */
  paymentMethods: paymentMethodSchema.options,

  /** Shared with the API, which validates checkout against the same list. */
  governorates,
} as const;

export const telHref = `tel:+${site.phoneIntl}`;

export function whatsappHref(message?: string) {
  const base = `https://wa.me/${site.phoneIntl}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

/**
 * A price as the store shows it. Prices are USD with Western digits ("$70") in
 * both languages, as Lebanese shops write them; only the "on request" text is
 * translated, so pass `t("Common.priceOnRequest")`.
 */
export function formatPrice(price: number | null | undefined, onRequest: string) {
  return price == null ? onRequest : formatUsd(price);
}

/**
 * Keeps a left-to-right run (a phone number, an order number, "2,500+") in its
 * own order inside Arabic text, using Unicode isolates. Use it for values passed
 * into translated messages; in JSX, `<bdi dir="ltr">` does the same.
 */
export function ltr(text: string) {
  return `\u2066${text}\u2069`;
}
