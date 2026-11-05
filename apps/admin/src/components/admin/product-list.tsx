import Link from "next/link";
import { AlertTriangle, ImageIcon } from "lucide-react";
import type { AdminProductListItem } from "@reactive-store/shared";

import { formatPrice, stockLabel } from "@/lib/admin/format";
import { cn } from "@/lib/utils";

/** Products as a list of rows linking to their editor. `showDepartment` adds the department name. */
export function ProductList({
  products,
  showDepartment = true,
  empty = "No products found.",
}: {
  products: AdminProductListItem[];
  showDepartment?: boolean;
  empty?: string;
}) {
  if (!products.length) {
    return <p className="rounded-xl border border-dashed border-input bg-card p-8 text-muted-foreground">{empty}</p>;
  }
  return (
    <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
      {products.map((p) => (
        <li key={p.id}>
          <Link href={`/products/${p.id}`} className="flex items-center gap-4 p-3 hover:bg-muted/50">
            <span className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
              {p.image ? (
                // Admin thumbnails: plain <img>, no need for image optimisation here.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.image} alt="" className="size-full object-contain mix-blend-multiply" />
              ) : (
                <ImageIcon aria-hidden="true" className="size-5 text-muted-foreground" />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{p.name}</span>
              <span className="block truncate text-[13px] text-muted-foreground">
                {showDepartment ? `${p.categoryName} · ` : ""}
                {formatPrice(p.price)} · {stockLabel[p.stock]}
              </span>
              {p.warnings.length ? (
                <span className="mt-0.5 flex items-center gap-1 text-[13px] text-warning">
                  <AlertTriangle aria-hidden="true" className="size-3.5" />
                  {p.warnings[0]}
                  {p.warnings.length > 1 ? ` +${p.warnings.length - 1} more` : ""}
                </span>
              ) : null}
            </span>
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                p.status === "published" ? "bg-[#e6f0e9] text-[#2a6b3c]" : "bg-muted text-muted-foreground",
              )}
            >
              {p.status === "published" ? "Published" : "Draft"}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
