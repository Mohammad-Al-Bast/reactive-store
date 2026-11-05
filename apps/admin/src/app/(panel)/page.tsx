import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AlertTriangle } from "lucide-react";
import type { AdminDashboard } from "@reactive-store/shared";

import { EnquiryCard } from "@/components/admin/enquiry-card";
import { OrderTable } from "@/components/admin/order-table";
import { LoadingBlock, PageHeader } from "@/components/admin/ui";
import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { SectionCards } from "@/components/section-cards";
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

function SectionTitle({ id, title, href, link }: { id: string; title: string; href: string; link: string }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 id={id} className="text-lg font-bold">
        {title}
      </h2>
      <Link href={href} className="text-sm font-semibold text-brand hover:underline">
        {link}
      </Link>
    </div>
  );
}

async function Dashboard() {
  const d = await adminGet<AdminDashboard>("/admin/dashboard", "/");

  return (
    <div className="flex flex-col gap-6">
      {d.failedAlerts > 0 ? (
        <p role="alert" className="flex items-start gap-3 rounded-xl border border-[#e8d3a6] bg-warning-soft p-4 text-sm">
          <AlertTriangle aria-hidden="true" className="size-5 shrink-0 text-warning" />
          <span>
            <strong>
              {d.failedAlerts} staff alert{d.failedAlerts === 1 ? "" : "s"} could not be sent.
            </strong>{" "}
            Check the Telegram settings, then resend from the order page.
          </span>
        </p>
      ) : null}

      <SectionCards dashboard={d} />
      <ChartAreaInteractive daily={d.daily} />

      <section aria-labelledby="recent">
        <SectionTitle id="recent" title="Latest orders" href="/orders" link="All orders" />
        <OrderTable orders={d.recentOrders} />
      </section>

      <section aria-labelledby="enquiries">
        <SectionTitle id="enquiries" title="Open enquiries" href="/enquiries" link="All enquiries" />
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
