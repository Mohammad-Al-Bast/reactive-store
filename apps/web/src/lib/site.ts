/**
 * Store-wide settings. Everything a customer reads about delivery, payment,
 * warranty and how to reach you lives here — edit this one file.
 *
 * Values still in [brackets] are facts only the store owner can confirm.
 * Replace them, or set them to "" to hide that line on the site.
 */
export const site = {
  name: "Reactive Store",
  tagline: "Medical, Rehabilitation & Healthcare",
  slogan: "Quality Equipment. Safer Care. Better Lives.",
  yearsInField: 5,

  phoneDisplay: "81 164 065",
  /** International format, digits only — used for tel: and WhatsApp links. */
  phoneIntl: "96181164065",
  email: "reactive.medicalservices.lb@gmail.com",
  address: "Shtoura, Sultan Center, Third Floor",
  mapUrl: "https://maps.app.goo.gl/Rcuwrb2Fpk81uRn88",
  hours: [
    { days: "Mon – Fri", time: "8:00 – 18:00" },
    { days: "Saturday", time: "8:00 – 14:00" },
    { days: "Sunday", time: "Closed" },
  ],
  replyTime: "one working day (24h)",

  delivery: "Delivery across Lebanon",
  deliveryTime: "3–5 days, all Lebanon",
  deliveryFee: "Confirmed on WhatsApp",
  /** Warranty differs per product, so it is confirmed per item rather than promised site-wide. */
  warranty: "Confirmed per item",
  customersServed: "2,500+",

  social: {
    instagram: "", // e.g. "https://instagram.com/reactivestore"
    facebook: "",
  },

  paymentMethods: [
    { id: "cod", name: "Cash on delivery", description: "Pay when it arrives" },
    { id: "wallet", name: "Whish / OMT", description: "Transfer before dispatch" },
  ],

  governorates: [
    "Beirut",
    "Mount Lebanon",
    "North",
    "Akkar",
    "Bekaa",
    "Baalbek-Hermel",
    "South",
    "Nabatieh",
  ],

  currency: "USD",
} as const;

export const telHref = `tel:+${site.phoneIntl}`;

export function whatsappHref(message?: string) {
  const base = `https://wa.me/${site.phoneIntl}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export function formatPrice(price: number | null | undefined) {
  if (price == null) return "Price on request";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: site.currency,
    maximumFractionDigits: 2,
  }).format(price);
}
