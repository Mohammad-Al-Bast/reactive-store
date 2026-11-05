import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  hasPlaceholder,
  productWarnings,
  type AdminCategory,
  type AdminProduct,
  type AdminProductListItem,
  type adminProductListQuerySchema,
  type categoryUpsertSchema,
  type ProductTranslation,
  type productUpsertSchema,
  type Stock,
} from '@reactive-store/shared';
import type { z } from 'zod';
import { pickTranslation, stockFromDb } from '../catalog/catalog.mapper.js';
import { Prisma, type Locale, type Stock as DbStock } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ImageStorage } from './image-storage.service.js';
import { WebRevalidator } from './web-revalidator.service.js';

type ProductInput = z.output<typeof productUpsertSchema>;
type CategoryInput = z.output<typeof categoryUpsertSchema>;

const stockToDb: Record<Stock, DbStock> = { 'in-stock': 'in_stock', 'low-stock': 'low_stock', 'to-order': 'to_order' };

const productInclude = {
  translations: true,
  images: { orderBy: { sortOrder: 'asc' } },
  related: { orderBy: { sortOrder: 'asc' }, select: { related: { select: { slug: true } } } },
  category: { include: { translations: true } },
} satisfies Prisma.ProductInclude;
type ProductRow = Prisma.ProductGetPayload<{ include: typeof productInclude }>;

const jsonList = <T>(v: Prisma.JsonValue | null): T[] => (Array.isArray(v) ? (v as T[]) : []);

function toTranslation(t: ProductRow['translations'][number]): ProductTranslation {
  return {
    name: t.name,
    type: t.type,
    summary: t.summary,
    badge: t.badge ?? undefined,
    description: t.description ?? undefined,
    safety: t.safety ?? undefined,
    modes: jsonList(t.modes),
    inTheBox: jsonList(t.inTheBox),
    specs: jsonList(t.specs),
    faq: jsonList(t.faq),
  };
}

function translationsOf(row: ProductRow) {
  return Object.fromEntries(row.translations.map((t) => [t.locale, toTranslation(t)])) as AdminProduct['translations'];
}

const isUniqueViolation = (err: unknown) => err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';

/** Product and category editing for the admin panel. Every change refreshes the store's cache. */
@Injectable()
export class CatalogAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly images: ImageStorage,
    private readonly web: WebRevalidator,
  ) {}

  /* ---------- Categories ---------- */

  async categories(): Promise<AdminCategory[]> {
    const rows = await this.prisma.category.findMany({
      include: { translations: true, _count: { select: { products: true } } },
      orderBy: { sortOrder: 'asc' },
    });
    return rows.map((c) => ({
      id: c.id,
      slug: c.slug,
      sortOrder: c.sortOrder,
      productCount: c._count.products,
      translations: Object.fromEntries(
        c.translations.map((t) => [t.locale, { name: t.name, short: t.short, description: t.description, items: t.items }]),
      ),
    }));
  }

  async saveCategory(id: string | null, input: CategoryInput): Promise<AdminCategory[]> {
    const locales = Object.entries(input.translations).filter((e) => e[1]) as [Locale, NonNullable<CategoryInput['translations']['en']>][];
    try {
      await this.prisma.$transaction(async (tx) => {
        const category = id
          ? await tx.category.update({ where: { id }, data: { slug: input.slug, sortOrder: input.sortOrder } })
          : await tx.category.create({ data: { slug: input.slug, sortOrder: input.sortOrder } });
        await tx.categoryTranslation.deleteMany({
          where: { categoryId: category.id, locale: { notIn: locales.map(([l]) => l) } },
        });
        for (const [locale, t] of locales) {
          await tx.categoryTranslation.upsert({
            where: { categoryId_locale: { categoryId: category.id, locale } },
            create: { categoryId: category.id, locale, ...t },
            update: t,
          });
        }
      });
    } catch (err) {
      if (isUniqueViolation(err)) throw new ConflictException('Another department already uses this web address (slug).');
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') throw new NotFoundException('Department not found');
      throw err;
    }
    void this.web.catalogChanged();
    return this.categories();
  }

  async deleteCategory(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id }, include: { _count: { select: { products: true } } } });
    if (!category) throw new NotFoundException('Department not found');
    if (category._count.products) {
      throw new ConflictException('Move or delete the products in this department first.');
    }
    await this.prisma.category.delete({ where: { id } });
    void this.web.catalogChanged();
  }

  /* ---------- Products ---------- */

  async products(query: z.output<typeof adminProductListQuerySchema>): Promise<AdminProductListItem[]> {
    const rows = await this.prisma.product.findMany({
      where: {
        ...(query.status ? { status: query.status } : {}),
        ...(query.categoryId ? { categoryId: query.categoryId } : {}),
        ...(query.q
          ? {
              OR: [
                { slug: { contains: query.q, mode: 'insensitive' } },
                { translations: { some: { name: { contains: query.q, mode: 'insensitive' } } } },
              ],
            }
          : {}),
      },
      include: productInclude,
      orderBy: [{ category: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
    });
    return rows.map((r) => {
      const translations = translationsOf(r);
      const price = r.price === null ? null : r.price.toNumber();
      return {
        id: r.id,
        slug: r.slug,
        name: pickTranslation(r.translations, 'en')?.name ?? r.slug,
        categoryId: r.categoryId,
        categoryName: pickTranslation(r.category.translations, 'en')?.name ?? r.category.slug,
        price,
        stock: stockFromDb[r.stock],
        status: r.status,
        bestSeller: r.bestSeller,
        image: r.images[0]?.url ?? null,
        warnings: productWarnings({ translations, imageCount: r.images.length, price }),
        updatedAt: r.updatedAt.toISOString(),
      };
    });
  }

  async product(id: string): Promise<AdminProduct> {
    const r = await this.prisma.product.findUnique({ where: { id }, include: productInclude });
    if (!r) throw new NotFoundException('Product not found');
    const translations = translationsOf(r);
    const price = r.price === null ? null : r.price.toNumber();
    return {
      id: r.id,
      slug: r.slug,
      categoryId: r.categoryId,
      price,
      stock: stockFromDb[r.stock],
      status: r.status,
      bestSeller: r.bestSeller,
      audience: r.audience,
      sortOrder: r.sortOrder,
      translations,
      related: r.related.map((x) => x.related.slug),
      images: r.images.map((i) => ({ id: i.id, url: i.url, alt: i.alt })),
      warnings: productWarnings({ translations, imageCount: r.images.length, price }),
      updatedAt: r.updatedAt.toISOString(),
    };
  }

  /** Creates (id null) or saves a product. Placeholder text can't be published. */
  async saveProduct(id: string | null, input: ProductInput): Promise<AdminProduct> {
    if (input.status === 'published' && hasPlaceholder(input.translations)) {
      throw new UnprocessableEntityException(
        'Replace the [bracketed] placeholder text before publishing, or save as a draft.',
      );
    }
    if (!(await this.prisma.category.count({ where: { id: input.categoryId } }))) {
      throw new UnprocessableEntityException('Choose a department.');
    }
    const relatedSlugs = [...new Set(input.related)].filter((s) => s !== input.slug);
    const related = await this.prisma.product.findMany({ where: { slug: { in: relatedSlugs } }, select: { id: true, slug: true } });
    const unknown = relatedSlugs.filter((s) => !related.some((r) => r.slug === s));
    if (unknown.length) throw new UnprocessableEntityException(`Unknown related products: ${unknown.join(', ')}`);

    const fields = {
      slug: input.slug,
      categoryId: input.categoryId,
      price: input.price,
      stock: stockToDb[input.stock],
      status: input.status,
      bestSeller: input.bestSeller,
      audience: [...new Set(input.audience)],
      sortOrder: input.sortOrder,
    };
    const locales = Object.entries(input.translations).filter((e) => e[1]) as [Locale, ProductTranslation][];

    let productId: string;
    try {
      productId = await this.prisma.$transaction(async (tx) => {
        const product = id
          ? await tx.product.update({ where: { id }, data: fields })
          : await tx.product.create({ data: fields });

        await tx.productTranslation.deleteMany({
          where: { productId: product.id, locale: { notIn: locales.map(([l]) => l) } },
        });
        for (const [locale, t] of locales) {
          const data = {
            name: t.name,
            type: t.type,
            summary: t.summary,
            badge: t.badge ?? null,
            description: t.description ?? null,
            safety: t.safety ?? null,
            modes: t.modes,
            inTheBox: t.inTheBox,
            specs: t.specs,
            faq: t.faq,
          };
          await tx.productTranslation.upsert({
            where: { productId_locale: { productId: product.id, locale } },
            create: { productId: product.id, locale, ...data },
            update: data,
          });
        }

        await tx.productRelated.deleteMany({ where: { productId: product.id } });
        await tx.productRelated.createMany({
          data: relatedSlugs.map((slug, sortOrder) => ({
            productId: product.id,
            relatedId: related.find((r) => r.slug === slug)!.id,
            sortOrder,
          })),
        });

        // Listed images take the given order and alt text; any others keep their order after them.
        const existing = await tx.productImage.findMany({ where: { productId: product.id }, orderBy: { sortOrder: 'asc' } });
        const listed = input.images.filter((i) => existing.some((e) => e.id === i.id));
        const rest = existing.filter((e) => !listed.some((i) => i.id === e.id));
        for (const [sortOrder, img] of listed.entries()) {
          await tx.productImage.update({ where: { id: img.id }, data: { sortOrder, alt: img.alt ?? null } });
        }
        for (const [n, img] of rest.entries()) {
          await tx.productImage.update({ where: { id: img.id }, data: { sortOrder: listed.length + n } });
        }
        return product.id;
      });
    } catch (err) {
      if (isUniqueViolation(err)) throw new ConflictException('Another product already uses this web address (slug).');
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') throw new NotFoundException('Product not found');
      throw err;
    }
    void this.web.catalogChanged();
    return this.product(productId);
  }

  async deleteProduct(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id }, include: { images: true } });
    if (!product) throw new NotFoundException('Product not found');
    // Past orders keep their copied name and price; their link to the product is cleared.
    await this.prisma.product.delete({ where: { id } });
    await Promise.all(product.images.map((i) => this.images.remove(i.url)));
    void this.web.catalogChanged();
  }

  async addImage(productId: string, file: Parameters<ImageStorage['saveProductImage']>[0]): Promise<AdminProduct> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { translations: true, _count: { select: { images: true } } },
    });
    if (!product) throw new NotFoundException('Product not found');
    const url = await this.images.saveProductImage(file);
    await this.prisma.productImage.create({
      data: {
        productId,
        url,
        alt: pickTranslation(product.translations, 'en')?.name ?? null,
        sortOrder: product._count.images,
      },
    });
    void this.web.catalogChanged();
    return this.product(productId);
  }

  async removeImage(productId: string, imageId: string): Promise<AdminProduct> {
    const image = await this.prisma.productImage.findFirst({ where: { id: imageId, productId } });
    if (!image) throw new NotFoundException('Image not found');
    await this.prisma.productImage.delete({ where: { id: imageId } });
    await this.images.remove(image.url);
    void this.web.catalogChanged();
    return this.product(productId);
  }
}
