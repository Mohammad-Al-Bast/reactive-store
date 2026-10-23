import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ShopLayout } from "@/components/shop-layout";
import { categories, getCategory, productsIn } from "@/lib/products";

export function generateStaticParams() {
  return categories.map((c) => ({ category: c.slug }));
}

export async function generateMetadata({ params }: PageProps<"/shop/[category]">): Promise<Metadata> {
  const category = getCategory((await params).category);
  return category ? { title: category.name, description: category.description } : {};
}

export default async function CategoryPage({ params }: PageProps<"/shop/[category]">) {
  const category = getCategory((await params).category);
  if (!category) notFound();

  return (
    <ShopLayout
      title={category.name}
      description={category.description}
      products={productsIn(category.slug)}
      active={category.slug}
    />
  );
}
