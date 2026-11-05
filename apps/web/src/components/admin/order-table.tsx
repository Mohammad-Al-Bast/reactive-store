import Link from "next/link";
import type { AdminOrderListItem } from "@reactive-store/shared";

import { PaymentBadge, StatusBadge } from "@/components/admin/ui";
import { formatWhen } from "@/lib/admin/format";
import { formatPrice } from "@/lib/site";

export function orderTotal(o: Pick<AdminOrderListItem, "subtotal" | "totalToConfirm">) {
  if (o.subtotal <= 0) return "To confirm";
  return `${formatPrice(o.subtotal)}${o.totalToConfirm ? " +" : ""}`;
}

/** Orders as a table on wide screens and as cards on phones. */
export function OrderTable({ orders }: { orders: AdminOrderListItem[] }) {
  if (!orders.length) {
    return <p className="rounded-xl border border-dashed border-input bg-card p-8 text-muted-foreground">No orders found.</p>;
  }
  return (
    <>
      <div className="hidden overflow-hidden rounded-xl border border-border bg-card md:block">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-[13px] text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 font-semibold">Order</th>
              <th className="px-4 py-2.5 font-semibold">Placed</th>
              <th className="px-4 py-2.5 font-semibold">Customer</th>
              <th className="px-4 py-2.5 text-right font-semibold">Items</th>
              <th className="px-4 py-2.5 text-right font-semibold">Total</th>
              <th className="px-4 py-2.5 font-semibold">Payment</th>
              <th className="px-4 py-2.5 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.number} className="border-t border-border hover:bg-muted/50">
                <td className="px-4 py-3 font-semibold">
                  <Link href={`/admin/orders/${o.number}`} className="text-brand hover:underline">
                    {o.number}
                  </Link>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">{formatWhen(o.createdAt)}</td>
                <td className="px-4 py-3">
                  <div>{o.customerName}</div>
                  <div className="text-[13px] text-muted-foreground">
                    {o.phone} · {o.city}
                  </div>
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{o.itemCount}</td>
                <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums">{orderTotal(o)}</td>
                <td className="px-4 py-3">
                  <PaymentBadge status={o.paymentStatus} />
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={o.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="flex flex-col gap-3 md:hidden">
        {orders.map((o) => (
          <li key={o.number}>
            <Link href={`/admin/orders/${o.number}`} className="flex flex-col gap-1.5 rounded-xl border border-border bg-card p-4">
              <span className="flex items-center justify-between gap-2">
                <span className="font-semibold text-brand">{o.number}</span>
                <StatusBadge status={o.status} />
              </span>
              <span className="text-sm">
                {o.customerName} · {o.city}
              </span>
              <span className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  {formatWhen(o.createdAt)} · {o.itemCount} item{o.itemCount === 1 ? "" : "s"}
                </span>
                <span className="font-semibold text-foreground">{orderTotal(o)}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
