import {
  defaultLocale,
  productFaqSchema,
  productModeSchema,
  productSpecSchema,
  type Category,
  type Locale,
  type Product,
  type Stock,
} from '@reactive-store/shared';
import { z } from 'zod';
import type { Prisma, Stock as DbStock } from '../generated/prisma/client.js';

export const stockFromDb: Record<DbStock, Stock> = {
  in_stock: 'in-stock',
  low_stock: 'low-stock',
  to_order: 'to-order',
};

/** Prisma `include` for everything needed to build a public product. */
export const productInclude = {
  category: { select: { slug: true } },
  translations: true,
  images: { orderBy: { sortOrder: 'asc' } },
  related: {
    orderBy: { sortOrder: 'asc' },
    where: { related: { status: 'published' } },
    select: { related: { select: { slug: true } } },
  },
} satisfies Prisma.ProductInclude;

export type ProductRow = Prisma.ProductGetPayload<{ include: typeof productInclude }>;
export type CategoryRow = Prisma.CategoryGetPayload<{ include: { translations: true } }>;

/** The translation for `locale`, else the default locale, else any. */
export function pickTranslation<T extends { locale: string }>(rows: T[], locale: Locale) {
  return (
    rows.find((r) => r.locale === locale) ?? rows.find((r) => r.locale === defaultLocale) ?? rows[0]
  );
}

/** JSON columns are typed loosely in the DB; drop anything that isn't the expected shape. */
function jsonArray<T extends z.ZodType>(value: unknown, item: T): z.infer<T>[] | undefined {
  const parsed = z.array(item).safeParse(value);
  return parsed.success && parsed.data.length ? parsed.data : undefined;
}

export function toCategory(row: CategoryRow, locale: Locale): Category | null {
  const t = pickTranslation(row.translations, locale);
  if (!t) return null;
  return { slug: row.slug, name: t.name, short: t.short, description: t.description, items: t.items };
}

export function toProduct(row: ProductRow, locale: Locale): Product | null {
  const t = pickTranslation(row.translations, locale);
  if (!t) return null;
  const related = row.related.map((r) => r.related.slug);
  return {
    slug: row.slug,
    name: t.name,
    category: row.category.slug,
    type: t.type,
    summary: t.summary,
    price: row.price === null ? null : row.price.toNumber(),
    stock: stockFromDb[row.stock],
    image: row.images[0]?.url,
    badge: t.badge ?? undefined,
    bestSeller: row.bestSeller || undefined,
    audience: row.audience,
    description: t.description ?? undefined,
    modes: jsonArray(t.modes, productModeSchema),
    inTheBox: jsonArray(t.inTheBox, z.string()),
    specs: jsonArray(t.specs, productSpecSchema),
    safety: t.safety ?? undefined,
    faq: jsonArray(t.faq, productFaqSchema),
    related: related.length ? related : undefined,
  };
}
