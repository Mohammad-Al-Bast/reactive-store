import type { OrderLine } from '@reactive-store/shared';
import { Prisma } from '../generated/prisma/client.js';

export type PricedProduct = { id: string; slug: string; name: string; price: Prisma.Decimal | null };

export type PricedLine = OrderLine & { productId: string; unitPriceDecimal: Prisma.Decimal | null };

export type PricedOrder = {
  lines: PricedLine[];
  subtotal: Prisma.Decimal;
  totalToConfirm: boolean;
  /** Slugs that are not (or no longer) orderable. */
  missing: string[];
};

/** Adds up quantities for repeated slugs, keeping first-seen order and capping at 99. */
export function mergeItems(items: { slug: string; qty: number }[]) {
  const merged = new Map<string, number>();
  for (const { slug, qty } of items) merged.set(slug, Math.min(99, (merged.get(slug) ?? 0) + qty));
  return [...merged].map(([slug, qty]) => ({ slug, qty }));
}

/**
 * Prices an order from the database's current products. Whatever the browser
 * believed the prices were is ignored. Lines with no price stay on the order
 * as "price on request" and mark the total as to be confirmed.
 */
export function priceOrder(
  items: { slug: string; qty: number }[],
  products: Map<string, PricedProduct>,
): PricedOrder {
  const lines: PricedLine[] = [];
  const missing: string[] = [];
  let subtotal = new Prisma.Decimal(0);
  let totalToConfirm = false;

  for (const { slug, qty } of mergeItems(items)) {
    const product = products.get(slug);
    if (!product) {
      missing.push(slug);
      continue;
    }
    if (product.price === null) totalToConfirm = true;
    else subtotal = subtotal.plus(product.price.times(qty));
    lines.push({
      productId: product.id,
      slug,
      name: product.name,
      qty,
      unitPrice: product.price === null ? null : product.price.toNumber(),
      unitPriceDecimal: product.price,
    });
  }

  return { lines, subtotal, totalToConfirm, missing };
}
