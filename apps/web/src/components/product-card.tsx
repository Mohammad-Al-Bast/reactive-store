import Link from "next/link";

import { AddToCartButton } from "@/components/add-to-cart-button";
import { ProductImage } from "@/components/product-image";
import { StockStatus } from "@/components/stock-status";
import { Badge } from "@/components/ui/badge";
import type { Product } from "@/lib/products";
import { formatPrice } from "@/lib/site";

export function ProductCard({ product }: { product: Product }) {
  const href = `/product/${product.slug}`;
  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-[#cdbf9f]">
      <Link href={href} tabIndex={-1} aria-hidden="true" className="relative block">
        <ProductImage product={product} className="h-56" />
        {product.badge ? <Badge className="absolute left-3 top-3">{product.badge}</Badge> : null}
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <span className="text-xs font-semibold uppercase tracking-[0.06em] text-brand">{product.type}</span>
        <h3 className="text-base font-semibold leading-snug">
          <Link href={href} className="hover:text-brand">
            {product.name}
          </Link>
        </h3>
        <p className="flex-1 text-sm text-muted-foreground">{product.summary}</p>
        <StockStatus stock={product.stock} />
        <div className="mt-1 flex items-center justify-between gap-3 border-t border-[#efebe2] pt-3">
          <span className={product.price == null ? "text-sm font-semibold text-muted-foreground" : "text-lg font-bold"}>
            {formatPrice(product.price)}
          </span>
          <AddToCartButton slug={product.slug} name={product.name} />
        </div>
      </div>
    </article>
  );
}
