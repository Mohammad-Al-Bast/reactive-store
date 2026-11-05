import { z } from "zod";
import { localeSchema, stockSchema } from "./enums.js";

export const audienceSchema = z.enum(["clinic", "home", "student"]);
export type Audience = z.infer<typeof audienceSchema>;

/** A product slug: lowercase letters, digits and hyphens. */
export const slugSchema = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid slug");

export const categorySchema = z.object({
  slug: z.string(),
  name: z.string(),
  short: z.string(),
  description: z.string(),
  items: z.string(),
});
export type Category = z.infer<typeof categorySchema>;

export const productModeSchema = z.object({ name: z.string(), text: z.string() });
export const productSpecSchema = z.object({ label: z.string(), value: z.string() });
export const productFaqSchema = z.object({ q: z.string(), a: z.string() });

/**
 * A published product as the store reads it, in one locale.
 * Same shape as the original `Product` in apps/web, so pages change little.
 */
export const productSchema = z.object({
  slug: z.string(),
  name: z.string(),
  category: z.string(),
  type: z.string(),
  summary: z.string(),
  /** USD, or null for "price on request". */
  price: z.number().nullable(),
  stock: stockSchema,
  image: z.string().optional(),
  badge: z.string().optional(),
  bestSeller: z.boolean().optional(),
  audience: z.array(audienceSchema),
  description: z.string().optional(),
  modes: z.array(productModeSchema).optional(),
  inTheBox: z.array(z.string()).optional(),
  specs: z.array(productSpecSchema).optional(),
  safety: z.string().optional(),
  faq: z.array(productFaqSchema).optional(),
  related: z.array(z.string()).optional(),
});
export type Product = z.infer<typeof productSchema>;

/** Query for `GET /api/products`. */
export const productListQuerySchema = z.object({
  category: slugSchema.optional(),
  locale: localeSchema.optional(),
});
export type ProductListQuery = z.infer<typeof productListQuerySchema>;

/** Body for `POST /api/cart/resolve`: what the browser keeps in localStorage. */
export const cartResolveRequestSchema = z.object({
  locale: localeSchema.optional(),
  items: z
    .array(z.object({ slug: slugSchema, qty: z.number().int().min(1).max(99) }))
    .max(50),
});
export type CartResolveRequest = z.infer<typeof cartResolveRequestSchema>;

/** Lines whose product is gone or unpublished are dropped, and listed in `missing`. */
export const cartResolveResponseSchema = z.object({
  lines: z.array(z.object({ qty: z.number().int(), product: productSchema })),
  missing: z.array(z.string()),
});
export type CartResolveResponse = z.infer<typeof cartResolveResponseSchema>;
