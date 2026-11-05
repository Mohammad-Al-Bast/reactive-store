import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AlertTriangle } from "lucide-react";
import type { AdminDashboard } from "@reactive-store/shared";

import { EnquiryCard } from "@/components/admin/enquiry-card";
import { OrderTable } from "@/components/admin/order-table";
import { LoadingBlock, PageHeader } from "@/components/admin/ui";
import { adminGet } from "@/lib/admin/server";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <>
      <PageHeader title="Dashboard" />
      <Suspense fallback={<LoadingBlock />}>
        <Dashboard />
      </Suspense>
    </>
  );
}

async function Dashboard() {
  const d = await adminGet<AdminDashboard>("/admin/dashboard", "/admin");
  const stats = [
    { label: "New orders", value: d.orders.new, href: "/admin/orders?status=new", highlight: d.orders.new > 0 },
    { label: "Confirmed", value: d.orders.confirmed, href: "/admin/orders?status=confirmed" },
    { label: "Out for delivery", value: d.orders.outForDelivery, href: "/admin/orders?status=out-for-delivery" },
    { label: "Open enquiries", value: d.enquiries.unhandled, href: "/admin/enquiries", highlight: d.enquiries.unhandled > 0 },
  ];

  return (
    <div className="flex flex-col gap-8">
      {d.failedAlerts > 0 ? (
        <p role="alert" className="flex items-start gap-3 rounded-xl border border-[#e8d3a6] bg-warning-soft p-4 text-sm">
          <AlertTriangle aria-hidden="true" className="size-5 shrink-0 text-warning" />
          <span>
            <strong>{d.failedAlerts} staff alert{d.failedAlerts === 1 ? "" : "s"} could not be sent.</strong> Check the
            Telegram settings, then resend from the order page.
          </span>
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className={`flex flex-col gap-1 rounded-xl border bg-card p-4 transition-colors hover:border-foreground ${s.highlight ? "border-brand" : "border-border"}`}
          >
            <span className="text-sm text-muted-foreground">{s.label}</span>
            <span className="font-serif text-3xl tabular-nums">{s.value}</span>
          </Link>
        ))}
      </div>
      <p className="-mt-5 text-sm text-muted-foreground">
        {d.orders.today} order{d.orders.today === 1 ? "" : "s"} today · {d.orders.last7Days} in the last 7 days
      </p>

      <section aria-labelledby="recent">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="recent" className="text-lg font-bold">
            Latest orders
          </h2>
          <Link href="/admin/orders" className="text-sm font-semibold text-brand hover:underline">
            All orders
          </Link>
        </div>
        <OrderTable orders={d.recentOrders} />
      </section>

      <section aria-labelledby="enquiries">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="enquiries" className="text-lg font-bold">
            Open enquiries
          </h2>
          <Link href="/admin/enquiries" className="text-sm font-semibold text-brand hover:underline">
            All enquiries
          </Link>
        </div>
        {d.openEnquiries.length ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {d.openEnquiries.map((e) => (
              <EnquiryCard key={e.id} enquiry={e} />
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-input bg-card p-6 text-muted-foreground">
            No open enquiries. 🎉
          </p>
        )}
      </section>
    </div>
  );
}
