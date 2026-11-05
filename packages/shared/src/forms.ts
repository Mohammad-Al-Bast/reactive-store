import { z } from "zod";
import { localeSchema, paymentMethodSchema } from "./enums.js";
import { slugSchema } from "./catalog.js";

/** Lebanon's governorates, offered at checkout. */
export const governorates = [
  "Beirut",
  "Mount Lebanon",
  "North",
  "Akkar",
  "Bekaa",
  "Baalbek-Hermel",
  "South",
  "Nabatieh",
] as const;
export const governorateSchema = z.enum(governorates);
export type Governorate = z.infer<typeof governorateSchema>;

/** Who is enquiring. Labels live in the web app so they can be translated. */
export const enquiryRoles = [
  "physiotherapist",
  "massage-therapist",
  "cupping-practitioner",
  "acupuncture-practitioner",
  "clinic",
  "student",
  "home-care",
] as const;
export const enquiryRoleSchema = z.enum(enquiryRoles);
export type EnquiryRole = z.infer<typeof enquiryRoleSchema>;

export const enquiryTopics = [
  "product-advice",
  "practice-quote",
  "group-order",
  "existing-order",
  "warranty-repair",
] as const;
export const enquiryTopicSchema = z.enum(enquiryTopics);
export type EnquiryTopic = z.infer<typeof enquiryTopicSchema>;

/** A phone number with 7 to 15 digits; spaces, dashes, brackets and a leading + are allowed. */
export const phoneSchema = z
  .string()
  .trim()
  .max(30)
  .refine((v) => /^\+?[\d\s\-().]+$/.test(v), "Enter a phone number we can call or WhatsApp.")
  .refine((v) => {
    const digits = v.replace(/\D/g, "").length;
    return digits >= 7 && digits <= 15;
  }, "Enter a phone number we can call or WhatsApp.");

const requiredText = (max: number, message: string) => z.string().trim().min(1, message).max(max);

/**
 * Hidden form field that people never see or fill in. Bots that fill every field
 * set it, and the API then quietly drops the submission.
 */
export const honeypotSchema = z.string().max(500).optional();
export const HONEYPOT_FIELD = "website";

/* ---------- Orders ---------- */

export const orderCustomerSchema = z.object({
  name: requiredText(120, "Enter your full name."),
  phone: phoneSchema,
  governorate: governorateSchema,
  city: requiredText(120, "Enter your city or area."),
  address: requiredText(500, "Enter the building, floor or a nearby landmark."),
  notes: z.string().trim().max(1000).optional(),
});
export type OrderCustomer = z.infer<typeof orderCustomerSchema>;

/** Body for `POST /api/orders`. Prices are never sent; the API looks them up. */
export const createOrderSchema = z.object({
  locale: localeSchema.default("en"),
  items: z
    .array(z.object({ slug: slugSchema, qty: z.number().int().min(1).max(99) }))
    .min(1, "Your cart is empty.")
    .max(50),
  customer: orderCustomerSchema,
  paymentMethod: paymentMethodSchema,
  [HONEYPOT_FIELD]: honeypotSchema,
});
export type CreateOrderInput = z.input<typeof createOrderSchema>;
export type CreateOrder = z.output<typeof createOrderSchema>;

export const orderLineSchema = z.object({
  slug: z.string(),
  name: z.string(),
  qty: z.number().int(),
  /** USD at the time of the order, or null for "price on request". */
  unitPrice: z.number().nullable(),
});
export type OrderLine = z.infer<typeof orderLineSchema>;

/** What the API returns once an order is saved. */
export const orderSummarySchema = z.object({
  number: z.string(),
  createdAt: z.string(),
  items: z.array(orderLineSchema),
  /** Sum of priced lines. */
  subtotal: z.number(),
  /** True when any line is "price on request". */
  totalToConfirm: z.boolean(),
  paymentMethod: paymentMethodSchema,
  customer: orderCustomerSchema,
});
export type OrderSummary = z.infer<typeof orderSummarySchema>;

/** 422 body when some cart items can no longer be ordered. */
export type OrderUnavailableError = { message: string; missing: string[] };

/** Order references look like RS-261105-K3QZ7W. */
export const orderNumberPattern = /^RS-\d{6}-[0-9A-HJKMNP-TV-Z]{6}$/;

/* ---------- Enquiries ---------- */

/** Body for `POST /api/enquiries`. */
export const createEnquirySchema = z.object({
  locale: localeSchema.default("en"),
  name: requiredText(120, "Enter your name."),
  phone: phoneSchema,
  role: enquiryRoleSchema,
  topic: enquiryTopicSchema.optional(),
  message: requiredText(2000, "Tell us what you need."),
  [HONEYPOT_FIELD]: honeypotSchema,
});
export type CreateEnquiryInput = z.input<typeof createEnquirySchema>;
export type CreateEnquiry = z.output<typeof createEnquirySchema>;

/** Field errors as returned by the API's validation (400) responses. */
export type ValidationIssue = { path: string; message: string };
