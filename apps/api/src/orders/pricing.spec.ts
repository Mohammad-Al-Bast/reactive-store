import { orderNumberPattern } from '@reactive-store/shared';
import { Prisma } from '../generated/prisma/client.js';
import { makeOrderNumber } from './order-number.js';
import { mergeItems, priceOrder, type PricedProduct } from './pricing.js';

const product = (slug: string, price: string | null): [string, PricedProduct] => [
  slug,
  { id: `id-${slug}`, slug, name: slug.toUpperCase(), price: price === null ? null : new Prisma.Decimal(price) },
];

describe('priceOrder', () => {
  const products = new Map([product('tens', '70'), product('pads', '4.10'), product('gel', null)]);

  it('totals priced lines from the database prices', () => {
    const r = priceOrder([{ slug: 'tens', qty: 2 }, { slug: 'pads', qty: 3 }], products);
    expect(r.subtotal.toString()).toBe('152.3');
    expect(r.totalToConfirm).toBe(false);
    expect(r.lines.map((l) => [l.slug, l.qty, l.unitPrice])).toEqual([
      ['tens', 2, 70],
      ['pads', 3, 4.1],
    ]);
  });

  it('keeps "price on request" lines and marks the total to be confirmed', () => {
    const r = priceOrder([{ slug: 'tens', qty: 1 }, { slug: 'gel', qty: 2 }], products);
    expect(r.subtotal.toNumber()).toBe(70);
    expect(r.totalToConfirm).toBe(true);
    expect(r.lines[1]).toMatchObject({ slug: 'gel', qty: 2, unitPrice: null });
  });

  it('avoids floating-point drift', () => {
    const r = priceOrder([{ slug: 'pads', qty: 3 }], new Map([product('pads', '0.10')]));
    expect(r.subtotal.toString()).toBe('0.3');
  });

  it('reports products that cannot be ordered', () => {
    const r = priceOrder([{ slug: 'tens', qty: 1 }, { slug: 'gone', qty: 1 }], products);
    expect(r.missing).toEqual(['gone']);
  });
});

describe('mergeItems', () => {
  it('adds up repeated slugs and caps at 99', () => {
    expect(
      mergeItems([
        { slug: 'a', qty: 60 },
        { slug: 'b', qty: 1 },
        { slug: 'a', qty: 60 },
      ]),
    ).toEqual([
      { slug: 'a', qty: 99 },
      { slug: 'b', qty: 1 },
    ]);
  });
});

describe('makeOrderNumber', () => {
  it('uses the date in Lebanon and 6 unambiguous random characters', () => {
    // 22:30 UTC on 4 Nov is already 5 Nov in Beirut.
    const n = makeOrderNumber(new Date('2026-11-04T22:30:00Z'));
    expect(n).toMatch(orderNumberPattern);
    expect(n.startsWith('RS-261105-')).toBe(true);
  });

  it('does not repeat', () => {
    const numbers = new Set(Array.from({ length: 1000 }, () => makeOrderNumber()));
    expect(numbers.size).toBe(1000);
  });
});
