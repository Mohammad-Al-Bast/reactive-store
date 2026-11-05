/**
 * Imports the original catalogue into an empty database.
 *
 * Safe to run more than once: existing categories and products (matched by slug)
 * are left untouched, so it never overwrites edits made in the admin panel.
 *
 * Any product with [bracketed placeholder] text in any field is created as a
 * draft, so unfinished details can't reach customers.
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, type Stock } from '../src/generated/prisma/client.js';
import { hasPlaceholder } from './placeholder.js';
import { categories, products, type SeedProduct } from './seed-data.js';

const stockToDb: Record<SeedProduct['stock'], Stock> = {
  'in-stock': 'in_stock',
  'low-stock': 'low_stock',
  'to-order': 'to_order',
};

async function main() {
  const connectionString = process.env['DATABASE_URL'];
  if (!connectionString) throw new Error('DATABASE_URL is not set');
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  try {
    const categoryIds = new Map<string, string>();
    for (const [i, c] of categories.entries()) {
      const existing = await prisma.category.findUnique({ where: { slug: c.slug } });
      const row =
        existing ??
        (await prisma.category.create({
          data: {
            slug: c.slug,
            sortOrder: i,
            translations: {
              create: {
                locale: 'en',
                name: c.name,
                short: c.short,
                description: c.description,
                items: c.items,
              },
            },
          },
        }));
      categoryIds.set(c.slug, row.id);
    }

    const productIds = new Map<string, string>();
    let created = 0;
    const drafts: string[] = [];
    for (const [i, p] of products.entries()) {
      const existing = await prisma.product.findUnique({ where: { slug: p.slug } });
      if (existing) {
        productIds.set(p.slug, existing.id);
        continue;
      }
      const categoryId = categoryIds.get(p.category);
      if (!categoryId) throw new Error(`Unknown category "${p.category}" on ${p.slug}`);

      const draft = hasPlaceholder(p);
      if (draft) drafts.push(p.slug);

      const row = await prisma.product.create({
        data: {
          slug: p.slug,
          categoryId,
          price: p.price,
          stock: stockToDb[p.stock],
          status: draft ? 'draft' : 'published',
          bestSeller: p.bestSeller ?? false,
          audience: p.audience,
          sortOrder: i,
          translations: {
            create: {
              locale: 'en',
              name: p.name,
              type: p.type,
              summary: p.summary,
              badge: p.badge,
              description: p.description,
              modes: p.modes,
              inTheBox: p.inTheBox,
              specs: p.specs,
              safety: p.safety,
              faq: p.faq,
            },
          },
          images: p.image ? { create: { url: p.image, alt: p.name } } : undefined,
        },
      });
      productIds.set(p.slug, row.id);
      created++;
    }

    // Related links need every product to exist first.
    const related = products.flatMap((p) =>
      (p.related ?? []).flatMap((slug, sortOrder) => {
        const productId = productIds.get(p.slug);
        const relatedId = productIds.get(slug);
        return productId && relatedId ? [{ productId, relatedId, sortOrder }] : [];
      }),
    );
    await prisma.productRelated.createMany({ data: related, skipDuplicates: true });

    console.log(
      `Seeded ${categories.length} categories and ${created} new products` +
        (drafts.length ? ` (${drafts.length} as drafts: ${drafts.join(', ')})` : ''),
    );
  } finally {
    await prisma.$disconnect();
  }
}

await main();
