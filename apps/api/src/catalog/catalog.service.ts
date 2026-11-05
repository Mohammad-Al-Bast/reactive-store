import { Injectable, NotFoundException } from '@nestjs/common';
import {
  defaultLocale,
  type CartResolveRequest,
  type CartResolveResponse,
  type Category,
  type Locale,
  type Product,
} from '@reactive-store/shared';
import { PrismaService } from '../prisma/prisma.service.js';
import { productInclude, toCategory, toProduct } from './catalog.mapper.js';

const notNull = <T>(v: T | null): v is T => v !== null;

/** Public catalogue reads. Only published products are ever returned. */
@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async categories(locale: Locale = defaultLocale): Promise<Category[]> {
    const rows = await this.prisma.category.findMany({
      include: { translations: true },
      orderBy: { sortOrder: 'asc' },
    });
    return rows.map((r) => toCategory(r, locale)).filter(notNull);
  }

  async products(opts: { category?: string; locale?: Locale } = {}): Promise<Product[]> {
    const locale = opts.locale ?? defaultLocale;
    const rows = await this.prisma.product.findMany({
      where: {
        status: 'published',
        ...(opts.category ? { category: { slug: opts.category } } : {}),
      },
      include: productInclude,
      orderBy: [{ category: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
    });
    return rows.map((r) => toProduct(r, locale)).filter(notNull);
  }

  async product(slug: string, locale: Locale = defaultLocale): Promise<Product> {
    const row = await this.prisma.product.findFirst({
      where: { slug, status: 'published' },
      include: productInclude,
    });
    const product = row && toProduct(row, locale);
    if (!product) throw new NotFoundException(`Product "${slug}" not found`);
    return product;
  }

  /** Current details for the slugs in a browser cart. Repeated slugs are merged. */
  async resolveCart(req: CartResolveRequest): Promise<CartResolveResponse> {
    const locale = req.locale ?? defaultLocale;
    const qtyBySlug = new Map<string, number>();
    for (const { slug, qty } of req.items) {
      qtyBySlug.set(slug, Math.min(99, (qtyBySlug.get(slug) ?? 0) + qty));
    }
    const slugs = [...qtyBySlug.keys()];
    const rows = await this.prisma.product.findMany({
      where: { slug: { in: slugs }, status: 'published' },
      include: productInclude,
    });
    const bySlug = new Map(
      rows.map((r) => [r.slug, toProduct(r, locale)] as const).filter((e) => e[1] !== null),
    );
    return {
      lines: slugs.flatMap((slug) => {
        const product = bySlug.get(slug);
        return product ? [{ qty: qtyBySlug.get(slug)!, product }] : [];
      }),
      missing: slugs.filter((slug) => !bySlug.has(slug)),
    };
  }
}
