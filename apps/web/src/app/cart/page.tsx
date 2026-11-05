import type { Metadata } from "next";

import { Checkout } from "@/components/checkout";

export const metadata: Metadata = {
  title: "Your order",
  robots: { index: false },
};

export default function CartPage() {
  return <Checkout />;
}
