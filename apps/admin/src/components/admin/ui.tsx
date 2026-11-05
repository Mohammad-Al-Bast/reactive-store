import Link from "next/link";
import type { OrderStatus, PaymentStatus } from "@reactive-store/shared";

import { orderStatusLabel, orderStatusTone, paymentStatusLabel } from "@/lib/admin/format";
import { cn } from "@/lib/utils";

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap", orderStatusTone[status])}>
      {orderStatusLabel[status]}
    </span>
  );
}

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        status === "paid" ? "bg-[#e6f0e9] text-[#2a6b3c]" : status === "refunded" ? "bg-muted text-muted-foreground" : "bg-[#fbe9e7] text-[#9a3324]",
      )}
    >
      {paymentStatusLabel[status]}
    </span>
  );
}

export function PageHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <h1 className="display text-[clamp(1.75rem,3vw,2.25rem)] leading-tight">{title}</h1>
      {children}
    </div>
  );
}

/** Previous / next links that keep the other query parameters. */
export function Pagination({
  page,
  pageSize,
  total,
  basePath,
  params,
}: {
  page: number;
  pageSize: number;
  total: number;
  basePath: string;
  params: Record<string, string | undefined>;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const href = (p: number) => {
    const q = new URLSearchParams(Object.entries({ ...params, page: String(p) }).filter((e): e is [string, string] => !!e[1]));
    return `${basePath}?${q}`;
  };
  const link = "rounded-md border border-input bg-card px-3 py-1.5 text-sm hover:border-foreground";
  return (
    <nav aria-label="Pages" className="mt-5 flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">
        Page {page} of {pages} · {total} total
      </span>
      <span className="flex gap-2">
        {page > 1 ? (
          <Link className={link} href={href(page - 1)}>
            Previous
          </Link>
        ) : null}
        {page < pages ? (
          <Link className={link} href={href(page + 1)}>
            Next
          </Link>
        ) : null}
      </span>
    </nav>
  );
}
