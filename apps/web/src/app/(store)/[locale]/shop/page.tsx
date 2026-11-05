import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { ShopLayout } from "@/components/shop-layout";
import { pageLocale } from "@/i18n/locale";
import { getCategories, getProducts } from "@/lib/catalog";

export async function generateMetadata({ params }: PageProps<"/[locale]/shop">): Promise<Metadata> {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return { title: t("shopTitle"), description: t("shopDescription") };
}

export default async function ShopPage({ params }: PageProps<"/[locale]/shop">) {
  const locale = await pageLocale(params);
  const [categories, products, t] = await Promise.all([
    getCategories(locale),
    getProducts(locale),
    getTranslations({ locale, namespace: "Shop" }),
  ]);
  return (
    <ShopLayout
      title={t("allTitle")}
      description={t("allDescription")}
      products={products}
      categories={categories}
    />
  );
}
