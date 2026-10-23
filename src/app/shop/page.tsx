import type { Metadata } from "next";

import { ShopLayout } from "@/components/shop-layout";
import { products } from "@/lib/products";

export const metadata: Metadata = {
  title: "Shop all products",
  description: "Physiotherapy, massage, cupping, therapy supplies and daily-living aids.",
};

export default function ShopPage() {
  return (
    <ShopLayout
      title="All products"
      description="Physiotherapy and rehabilitation equipment, massage and recovery tools, cupping supplies, therapy consumables and daily-living aids."
      products={products}
    />
  );
}
