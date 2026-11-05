import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ShopLayout } from "@/components/shop-layout";
import { pageLocale } from "@/i18n/locale";
import { routing } from "@/i18n/routing";
import { getCategories, getProducts } from "@/lib/catalog";

export async function generateStaticParams() {
  const categories = await getCategories(routing.defaultLocale);
  return categories.map((c) => ({ category: c.slug }));
}

export async function generateMetadata({ params }: PageProps<"/[locale]/shop/[category]">): Promise<Metadata> {
  const locale = await pageLocale(params);
  const { category: slug } = await params;
  const category = (await getCategories(locale)).find((c) => c.slug === slug);
  return category ? { title: category.name, description: category.description } : {};
}

export default async function CategoryPage({ params }: PageProps<"/[locale]/shop/[category]">) {
  const locale = await pageLocale(params);
  const slug = (await params).category;
  const categories = await getCategories(locale);
  const category = categories.find((c) => c.slug === slug);
  if (!category) notFound();
  const products = await getProducts(locale, category.slug);

  return (
    <ShopLayout
      title={category.name}
      description={category.description}
      products={products}
      categories={categories}
      active={category.slug}
    />
  );
}
