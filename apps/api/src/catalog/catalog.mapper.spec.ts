import { Prisma } from '../generated/prisma/client.js';
import { pickTranslation, toProduct, type ProductRow } from './catalog.mapper.js';

const base = {
  productId: 'p1',
  type: 'TENS & EMS',
  summary: 'Summary',
  badge: null,
  description: null,
  modes: null,
  inTheBox: null,
  specs: null,
  safety: null,
  faq: null,
};

function row(overrides: Partial<ProductRow> = {}): ProductRow {
  return {
    id: 'p1',
    slug: 'tens',
    categoryId: 'c1',
    price: new Prisma.Decimal('70.50'),
    stock: 'low_stock',
    status: 'published',
    bestSeller: false,
    audience: ['home'],
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    category: { slug: 'physio' },
    translations: [{ ...base, locale: 'en', name: 'TENS' }],
    images: [],
    related: [],
    ...overrides,
  };
}

describe('toProduct', () => {
  it('maps a minimal row to the shared Product shape', () => {
    expect(toProduct(row(), 'en')).toEqual({
      slug: 'tens',
      name: 'TENS',
      category: 'physio',
      type: 'TENS & EMS',
      summary: 'Summary',
      price: 70.5,
      stock: 'low-stock',
      audience: ['home'],
    });
  });

  it('keeps null price as "price on request"', () => {
    expect(toProduct(row({ price: null }), 'en')?.price).toBeNull();
  });

  it('uses the first image and related slugs in order', () => {
    const p = toProduct(
      row({
        images: [{ id: 'i1', productId: 'p1', url: '/a.jpg', alt: null, sortOrder: 0 }],
        related: [{ related: { slug: 'pads' } }, { related: { slug: 'gel' } }],
      }),
      'en',
    );
    expect(p?.image).toBe('/a.jpg');
    expect(p?.related).toEqual(['pads', 'gel']);
  });

  it('drops malformed JSON fields instead of passing them on', () => {
    const t = { ...base, locale: 'en' as const, name: 'TENS', specs: [{ label: 'ok' }], inTheBox: ['Unit'] };
    const p = toProduct(row({ translations: [t] }), 'en');
    expect(p?.specs).toBeUndefined();
    expect(p?.inTheBox).toEqual(['Unit']);
  });

  it('returns null when the product has no translations', () => {
    expect(toProduct(row({ translations: [] }), 'en')).toBeNull();
  });
});

describe('pickTranslation', () => {
  const rows = [
    { locale: 'en', name: 'English' },
    { locale: 'ar', name: 'عربي' },
  ];

  it('prefers the requested locale', () => {
    expect(pickTranslation(rows, 'ar')?.name).toBe('عربي');
  });

  it('falls back to English when the locale is missing', () => {
    expect(pickTranslation([rows[0]], 'ar')?.name).toBe('English');
  });
});
