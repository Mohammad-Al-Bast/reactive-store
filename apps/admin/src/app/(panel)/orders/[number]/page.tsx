import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, MessageCircle, Phone } from "lucide-react";
import { orderNumberPattern, type AdminOrderDetail } from "@reactive-store/shared";

import { OrderSkeleton } from "@/components/admin/skeletons";
import { OrderActions, ResendAlertButton } from "@/components/admin/order-actions";
import { orderTotal } from "@/components/admin/order-table";
import { PaymentBadge, StatusBadge } from "@/components/admin/ui";
import { formatPrice, formatWhenFull, orderStatusLabel, paymentMethodLabel, phoneDigits } from "@/lib/admin/format";
import { adminGetOrNull } from "@/lib/admin/server";
import { storeUrl } from "@/lib/store";

export async function generateMetadata({ params }: PageProps<"/orders/[number]">): Promise<Metadata> {
  return { title: `Order ${(await params).number}` };
}

export default function OrderPage({ params }: PageProps<"/orders/[number]">) {
  return (
    <>
      <Link href="/orders" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft aria-hidden="true" className="size-4" /> All orders
      </Link>
      <Suspense fallback={<OrderSkeleton />}>
        <Order params={params} />
      </Suspense>
    </>
  );
}

async function Order({ params }: { params: PageProps<"/orders/[number]">["params"] }) {
  const { number } = await params;
  if (!orderNumberPattern.test(number)) notFound();
  const o = await adminGetOrNull<AdminOrderDetail>(`/admin/orders/${number}`, `/orders/${number}`);
  if (!o) notFound();
  const digits = phoneDigits(o.phone);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="display text-[clamp(1.6rem,3vw,2.1rem)] leading-tight">{o.number}</h1>
        <StatusBadge status={o.status} />
        <PaymentBadge status={o.paymentStatus} />
        <span className="w-full text-sm text-muted-foreground">
          Placed {formatWhenFull(o.createdAt)} · {paymentMethodLabel[o.paymentMethod]}
        </span>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px] lg:items-start">
        <div className="flex min-w-0 flex-col gap-6">
          <section aria-labelledby="h-customer" className="rounded-xl border border-border bg-card p-5">
            <h2 id="h-customer" className="mb-3 font-bold">
              Customer
            </h2>
            <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[120px_1fr]">
              <dt className="text-muted-foreground">Name</dt>
              <dd>{o.customerName}</dd>
              <dt className="text-muted-foreground">Phone</dt>
              <dd className="flex flex-wrap items-center gap-3">
                <span>{o.phone}</span>
                <a href={`tel:+${digits}`} className="inline-flex items-center gap-1 font-semibold text-brand hover:underline">
                  <Phone aria-hidden="true" className="size-3.5" /> Call
                </a>
                <a
                  href={`https://wa.me/${digits}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-brand hover:underline"
                >
                  <MessageCircle aria-hidden="true" className="size-3.5" /> WhatsApp
                </a>
              </dd>
              <dt className="text-muted-foreground">Area</dt>
              <dd>
                {o.city}, {o.governorate}
              </dd>
              <dt className="text-muted-foreground">Address</dt>
              <dd className="whitespace-pre-line">{o.address}</dd>
              {o.notes ? (
                <>
                  <dt className="text-muted-foreground">Customer notes</dt>
                  <dd className="whitespace-pre-line">{o.notes}</dd>
                </>
              ) : null}
            </dl>
          </section>

          <section aria-labelledby="h-items" className="rounded-xl border border-border bg-card p-5">
            <h2 id="h-items" className="mb-3 font-bold">
              Items
            </h2>
            <table className="w-full text-sm">
              <thead className="text-left text-[13px] text-muted-foreground">
                <tr>
                  <th className="pb-2 font-semibold">Product</th>
                  <th className="pb-2 text-right font-semibold">Qty</th>
                  <th className="pb-2 text-right font-semibold">Unit</th>
                  <th className="pb-2 text-right font-semibold">Line</th>
                </tr>
              </thead>
              <tbody>
                {o.items.map((i) => (
                  <tr key={i.slug} className="border-t border-border">
                    <td className="py-2.5 pr-3">
                      {i.productExists ? (
                        <a href={storeUrl(`/product/${i.slug}`)} target="_blank" rel="noreferrer" className="hover:text-brand hover:underline">
                          {i.name}
                        </a>
                      ) : (
                        i.name
                      )}
                    </td>
                    <td className="py-2.5 text-right tabular-nums">{i.qty}</td>
                    <td className="py-2.5 text-right whitespace-nowrap tabular-nums">{formatPrice(i.unitPrice)}</td>
                    <td className="py-2.5 text-right whitespace-nowrap tabular-nums">
                      {i.unitPrice == null ? "On request" : formatPrice(i.unitPrice * i.qty)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border font-bold">
                  <td className="pt-3" colSpan={3}>
                    Subtotal{o.totalToConfirm ? " (some items priced on request)" : ""}
                  </td>
                  <td className="pt-3 text-right whitespace-nowrap tabular-nums">{orderTotal(o)}</td>
                </tr>
              </tfoot>
            </table>
            <p className="mt-2 text-[13px] text-muted-foreground">Prices as they were when the order was placed. Delivery is extra.</p>
          </section>

          <section aria-labelledby="h-history" className="rounded-xl border border-border bg-card p-5">
            <h2 id="h-history" className="mb-3 font-bold">
              History
            </h2>
            <ol className="flex flex-col gap-3 border-l-2 border-border pl-4">
              {o.history.map((h, i) => (
                <li key={i} className="text-sm">
                  <div className="flex flex-wrap items-center gap-x-2">
                    <strong>{orderStatusLabel[h.status]}</strong>
                    <span className="text-muted-foreground">
                      {formatWhenFull(h.at)} · {h.by ?? "Website"}
                    </span>
                  </div>
                  {h.note ? <p className="mt-0.5 whitespace-pre-line text-body">{h.note}</p> : null}
                </li>
              ))}
            </ol>
          </section>
        </div>

        <div className="flex flex-col gap-6 lg:sticky lg:top-6">
          <OrderActions number={o.number} status={o.status} paymentStatus={o.paymentStatus} />

          <section aria-labelledby="h-alerts" className="rounded-xl border border-border bg-card p-5">
            <h2 id="h-alerts" className="mb-3 font-bold">
              Staff alerts
            </h2>
            {o.alerts.length ? (
              <ul className="flex flex-col gap-3 text-sm">
                {o.alerts.map((a) => (
                  <li key={a.id} className="flex flex-col gap-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="capitalize">
                        {a.channel} · {a.target}
                      </span>
                      <span
                        className={
                          a.status === "sent" ? "text-success" : a.status === "failed" ? "text-destructive" : "text-muted-foreground"
                        }
                      >
                        {a.status === "sent" ? "Sent" : a.status === "failed" ? "Failed" : "Sending…"}
                      </span>
                    </span>
                    {a.lastError ? <span className="text-[13px] text-muted-foreground">{a.lastError}</span> : null}
                    {a.status === "failed" ? <ResendAlertButton id={a.id} /> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No alerts were set up when this order was placed.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
