import type { Metadata } from "next";

import { ShopLayout } from "@/components/shop-layout";
import { pageLocale } from "@/i18n/locale";
import { getCategories, getProducts } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Shop all products",
  description: "Physiotherapy, massage, cupping, therapy supplies and daily-living aids.",
};

export default async function ShopPage({ params }: PageProps<"/[locale]/shop">) {
  const locale = await pageLocale(params);
  const [categories, products] = await Promise.all([getCategories(locale), getProducts(locale)]);
  return (
    <ShopLayout
      title="All products"
      description="Physiotherapy and rehabilitation equipment, massage and recovery tools, cupping supplies, therapy consumables and daily-living aids."
      products={products}
      categories={categories}
    />
  );
}
