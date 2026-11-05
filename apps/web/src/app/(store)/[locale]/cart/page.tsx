import type { Metadata } from "next";

import { Checkout } from "@/components/checkout";
import { pageLocale } from "@/i18n/locale";

export const metadata: Metadata = {
  title: "Your order",
  robots: { index: false },
};

export default async function CartPage({ params }: PageProps<"/[locale]/cart">) {
  await pageLocale(params);
  return <Checkout />;
}
