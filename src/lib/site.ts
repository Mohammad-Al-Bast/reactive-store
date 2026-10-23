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
  email: "[email address]",
  address: "[Address, city]",
  hours: [
    { days: "Mon – Fri", time: "[9:00 – 18:00]" },
    { days: "Saturday", time: "[9:00 – 14:00]" },
    { days: "Sunday", time: "[Closed]" },
  ],
  replyTime: "[one working day]",

  delivery: "Delivery across Lebanon [confirm]",
  deliveryTime: "[1–3] days, all Lebanon [confirm]",
  deliveryFee: "[FEE]",
  warranty: "[X] months [confirm]",
  customersServed: "[X]+",

  social: {
    instagram: "", // e.g. "https://instagram.com/reactivestore"
    facebook: "",
  },

  paymentMethods: [
    { id: "cod", name: "Cash on delivery", description: "Pay when it arrives [confirm]" },
    { id: "wallet", name: "[Whish / OMT]", description: "Transfer before dispatch [confirm]" },
    { id: "bank", name: "Bank transfer", description: "For clinics and bulk orders [confirm]" },
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
