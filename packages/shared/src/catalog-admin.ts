import { z } from "zod";
import { audienceSchema, slugSchema } from "./catalog.js";
import { productStatusSchema, stockSchema, type Locale, type ProductStatus, type Stock } from "./enums.js";
import { hasPlaceholder } from "./placeholder.js";

const text = (max: number, message = "Required.") => z.string().trim().min(1, message).max(max);
/** Optional text: blank becomes undefined, so it is stored as "not set". */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || undefined);

/* ---------- Categories ---------- */

export const categoryTranslationInputSchema = z.object({
  name: text(120, "Enter a name."),
  short: text(40, "Enter a short name."),
  description: text(1000, "Enter a description."),
  items: text(300, "List what it includes."),
});
export type CategoryTranslationInput = z.input<typeof categoryTranslationInputSchema>;

export const categoryUpsertSchema = z.object({
  slug: slugSchema,
  sortOrder: z.number().int().min(0).max(10_000).default(0),
  translations: z.object({
    en: categoryTranslationInputSchema,
    ar: categoryTranslationInputSchema.optional(),
  }),
});
export type CategoryUpsert = z.input<typeof categoryUpsertSchema>;

export type AdminCategory = {
  id: string;
  slug: string;
  sortOrder: number;
  productCount: number;
  translations: Partial<Record<Locale, z.output<typeof categoryTranslationInputSchema>>>;
};

/* ---------- Products ---------- */

export const productTranslationInputSchema = z.object({
  name: text(200, "Enter a name."),
  type: text(100, "Enter the product type."),
  summary: text(500, "Enter a one-line summary."),
  badge: optionalText(60),
  description: optionalText(5000),
  safety: optionalText(3000),
  modes: z
    .array(z.object({ name: text(80), text: text(500) }))
    .max(20)
    .default([]),
  inTheBox: z.array(text(200)).max(50).default([]),
  specs: z
    .array(z.object({ label: text(80), value: text(300) }))
    .max(60)
    .default([]),
  faq: z
    .array(z.object({ q: text(300), a: text(2000) }))
    .max(30)
    .default([]),
});
export type ProductTranslationInput = z.input<typeof productTranslationInputSchema>;
export type ProductTranslation = z.output<typeof productTranslationInputSchema>;

/** Body for creating or saving a product in the admin. */
export const productUpsertSchema = z.object({
  slug: slugSchema,
  categoryId: z.uuid("Choose a department."),
  /** USD; null shows "Price on request". */
  price: z.number().min(0).max(1_000_000).multipleOf(0.01, "Use at most 2 decimals.").nullable(),
  stock: stockSchema,
  status: productStatusSchema,
  bestSeller: z.boolean().default(false),
  audience: z.array(audienceSchema).max(3).default([]),
  sortOrder: z.number().int().min(0).max(10_000).default(0),
  translations: z.object({
    en: productTranslationInputSchema,
    /** Optional until Arabic is switched on (Phase 4). */
    ar: productTranslationInputSchema.optional(),
  }),
  /** Slugs of related products, in display order. */
  related: z.array(slugSchema).max(12).default([]),
  /** Existing images in display order, with their alt text. Images left out keep their place at the end. */
  images: z
    .array(z.object({ id: z.uuid(), alt: optionalText(200) }))
    .max(30)
    .default([]),
});
export type ProductUpsert = z.input<typeof productUpsertSchema>;

export type AdminProductImage = { id: string; url: string; alt: string | null };

export type AdminProductListItem = {
  id: string;
  slug: string;
  name: string;
  categoryId: string;
  categoryName: string;
  price: number | null;
  stock: Stock;
  status: ProductStatus;
  bestSeller: boolean;
  image: string | null;
  warnings: string[];
  updatedAt: string;
};

export type AdminProduct = {
  id: string;
  slug: string;
  categoryId: string;
  price: number | null;
  stock: Stock;
  status: ProductStatus;
  bestSeller: boolean;
  audience: z.infer<typeof audienceSchema>[];
  sortOrder: number;
  translations: Partial<Record<Locale, ProductTranslation>>;
  related: string[];
  images: AdminProductImage[];
  warnings: string[];
  updatedAt: string;
};

export const adminProductListQuerySchema = z.object({
  status: productStatusSchema.optional(),
  categoryId: z.uuid().optional(),
  q: z.string().trim().max(100).optional(),
});

/**
 * Things to fix before (or after) publishing. Placeholder text blocks publishing;
 * the rest are reminders.
 */
export function productWarnings(p: {
  translations: Partial<Record<Locale, unknown>>;
  imageCount: number;
  price: number | null;
}): string[] {
  const warnings: string[] = [];
  if (hasPlaceholder(p.translations)) warnings.push("Has [bracketed] placeholder text");
  if (!p.translations.ar) warnings.push("No Arabic translation yet");
  if (!p.imageCount) warnings.push("No photo");
  if (p.price === null) warnings.push("No price (shows “Price on request”)");
  return warnings;
}

/** Image uploads: accepted types and the size limit. */
export const PRODUCT_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const;
export const PRODUCT_IMAGE_MAX_BYTES = 8 * 1024 * 1024;
