import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { Checkout } from "@/components/checkout";
import { pageLocale } from "@/i18n/locale";

export async function generateMetadata({ params }: PageProps<"/[locale]/cart">): Promise<Metadata> {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return { title: t("cartTitle"), robots: { index: false } };
}

export default async function CartPage({ params }: PageProps<"/[locale]/cart">) {
  await pageLocale(params);
  return <Checkout />;
}
