import {
  formatUsd,
  type Audience,
  type EnquiryRole,
  type EnquiryTopic,
  type OrderStatus,
  type PaymentMethod,
  type PaymentStatus,
  type Stock,
} from "@reactive-store/shared";

/** Whether a department still needs its Arabic text (the store then shows English). */
export function missingArabic(c: { translations: { ar?: { name?: string } } }) {
  return !c.translations.ar?.name;
}

export function formatPrice(price: number | null | undefined) {
  return price == null ? "Price on request" : formatUsd(price);
}

export const stockLabel: Record<Stock, string> = {
  "in-stock": "In stock",
  "low-stock": "Low stock",
  "to-order": "Available to order",
};

export const audienceLabel: Record<Audience, string> = {
  clinic: "Clinic & professional use",
  home: "Home use",
  student: "Students & training",
};

export const roleLabels: Record<EnquiryRole, string> = {
  physiotherapist: "Physiotherapist",
  "massage-therapist": "Massage or recovery therapist",
  "cupping-practitioner": "Hijama / cupping practitioner",
  "acupuncture-practitioner": "Acupuncture practitioner",
  clinic: "Clinic or centre",
  student: "Student or trainee",
  "home-care": "Individual / family (home care)",
};

export const topicLabels: Record<EnquiryTopic, string> = {
  "product-advice": "Product advice",
  "practice-quote": "Quote for a practice",
  "group-order": "Student or group order",
  "existing-order": "Existing order",
  "warranty-repair": "Warranty or repair",
};

export const orderStatusLabel: Record<OrderStatus, string> = {
  new: "New",
  confirmed: "Confirmed",
  "out-for-delivery": "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

/** Button text for moving an order to each status. */
export const orderStatusAction: Record<OrderStatus, string> = {
  new: "Reopen as new",
  confirmed: "Mark confirmed",
  "out-for-delivery": "Mark out for delivery",
  delivered: "Mark delivered",
  cancelled: "Cancel order",
};

export const orderStatusTone: Record<OrderStatus, string> = {
  new: "bg-[#fdf1d8] text-[#8a5a00]",
  confirmed: "bg-[#e3eefb] text-[#1f4f8a]",
  "out-for-delivery": "bg-[#ece6fa] text-[#55389a]",
  delivered: "bg-[#e6f0e9] text-[#2a6b3c]",
  cancelled: "bg-muted text-muted-foreground",
};

export const paymentStatusLabel: Record<PaymentStatus, string> = {
  unpaid: "Unpaid",
  paid: "Paid",
  refunded: "Refunded",
};

export const paymentMethodLabel: Record<PaymentMethod, string> = {
  cod: "Cash on delivery",
  wallet: "Whish / OMT",
};

const dateTime = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Beirut",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});
const fullDateTime = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Beirut",
  dateStyle: "medium",
  timeStyle: "short",
});

/** "5 Nov, 14:51" in Lebanon time. */
export const formatWhen = (iso: string) => dateTime.format(new Date(iso));
/** "5 Nov 2026, 14:51" in Lebanon time. */
export const formatWhenFull = (iso: string) => fullDateTime.format(new Date(iso));

/** Digits only, with Lebanon's country code, for tel: and WhatsApp links. */
export function phoneDigits(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (phone.trim().startsWith("+") || digits.startsWith("961")) return digits;
  return `961${digits.replace(/^0/, "")}`;
}
