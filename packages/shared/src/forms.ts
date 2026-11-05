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

/**
 * Error codes for the public order and enquiry forms. The API returns them as the
 * `message` of each validation issue, and the store translates them for the
 * customer (messages/<locale>.json, under "Errors").
 */
export const formErrorCodes = [
  "name_required",
  "phone_invalid",
  "city_required",
  "address_required",
  "message_required",
  "cart_empty",
  "too_long",
] as const;
export type FormErrorCode = (typeof formErrorCodes)[number];

/** A phone number with 7 to 15 digits; spaces, dashes, brackets and a leading + are allowed. */
export const phoneSchema = z
  .string()
  .trim()
  .max(30, "phone_invalid" satisfies FormErrorCode)
  .refine((v) => /^\+?[\d\s\-().]+$/.test(v), "phone_invalid" satisfies FormErrorCode)
  .refine((v) => {
    const digits = v.replace(/\D/g, "").length;
    return digits >= 7 && digits <= 15;
  }, "phone_invalid" satisfies FormErrorCode);

const requiredText = (max: number, code: FormErrorCode) =>
  z.string().trim().min(1, code).max(max, "too_long" satisfies FormErrorCode);

/**
 * Hidden form field that people never see or fill in. Bots that fill every field
 * set it, and the API then quietly drops the submission.
 */
export const honeypotSchema = z.string().max(500).optional();
export const HONEYPOT_FIELD = "website";

/* ---------- Orders ---------- */

export const orderCustomerSchema = z.object({
  name: requiredText(120, "name_required"),
  phone: phoneSchema,
  governorate: governorateSchema,
  city: requiredText(120, "city_required"),
  address: requiredText(500, "address_required"),
  notes: z.string().trim().max(1000, "too_long" satisfies FormErrorCode).optional(),
});
export type OrderCustomer = z.infer<typeof orderCustomerSchema>;

/** Body for `POST /api/orders`. Prices are never sent; the API looks them up. */
export const createOrderSchema = z.object({
  locale: localeSchema.default("en"),
  items: z
    .array(z.object({ slug: slugSchema, qty: z.number().int().min(1).max(99) }))
    .min(1, "cart_empty" satisfies FormErrorCode)
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
  name: requiredText(120, "name_required"),
  phone: phoneSchema,
  role: enquiryRoleSchema,
  topic: enquiryTopicSchema.optional(),
  message: requiredText(2000, "message_required"),
  [HONEYPOT_FIELD]: honeypotSchema,
});
export type CreateEnquiryInput = z.input<typeof createEnquirySchema>;
export type CreateEnquiry = z.output<typeof createEnquirySchema>;

/**
 * Field errors as returned by the API's validation (400) responses. For the order
 * and enquiry forms, `message` is a `FormErrorCode`; other checks (an unknown
 * governorate, say) keep Zod's English text, which the store shows as a generic error.
 */
export type ValidationIssue = { path: string; message: string };
