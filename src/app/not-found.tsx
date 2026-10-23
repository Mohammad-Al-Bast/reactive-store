import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container-page flex max-w-2xl flex-col items-start gap-4 py-24">
      <p className="eyebrow text-brand">Page not found</p>
      <h1 className="display text-[44px] leading-tight">We couldn&apos;t find that page.</h1>
      <p className="text-[17px] text-body">The product may have moved. Try the shop, or ask us directly.</p>
      <div className="flex flex-wrap gap-3">
        <Button asChild size="lg">
          <Link href="/shop">Go to the shop</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/contact">Contact us</Link>
        </Button>
      </div>
    </div>
  );
}
