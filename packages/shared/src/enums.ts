import { z } from "zod";

/** Languages the store is served in. `en` is the default. */
export const locales = ["en", "ar"] as const;
export const localeSchema = z.enum(locales);
export type Locale = z.infer<typeof localeSchema>;
export const defaultLocale: Locale = "en";

/** Stock is a status, not a counted quantity. */
export const stockSchema = z.enum(["in-stock", "low-stock", "to-order"]);
export type Stock = z.infer<typeof stockSchema>;

export const productStatusSchema = z.enum(["draft", "published"]);
export type ProductStatus = z.infer<typeof productStatusSchema>;

export const orderStatusSchema = z.enum([
  "new",
  "confirmed",
  "out-for-delivery",
  "delivered",
  "cancelled",
]);
export type OrderStatus = z.infer<typeof orderStatusSchema>;

/** Matches `site.paymentMethods` ids in apps/web: cash on delivery, or Whish / OMT transfer. */
export const paymentMethodSchema = z.enum(["cod", "wallet"]);
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;

export const paymentStatusSchema = z.enum(["unpaid", "paid", "refunded"]);
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;
