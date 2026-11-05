import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import type { AdminEnquiry, Page } from "@reactive-store/shared";

import { EnquiryCard } from "@/components/admin/enquiry-card";
import { LoadingBlock, PageHeader, Pagination } from "@/components/admin/ui";
import { adminGet } from "@/lib/admin/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Enquiries" };

const tabs = [
  { key: "open", label: "Open", handled: "false" },
  { key: "handled", label: "Handled", handled: "true" },
  { key: "all", label: "All", handled: undefined },
] as const;

export default function EnquiriesPage({ searchParams }: PageProps<"/admin/enquiries">) {
  return (
    <>
      <PageHeader title="Enquiries" />
      <Suspense fallback={<LoadingBlock />}>
        <Enquiries searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Enquiries({ searchParams }: { searchParams: PageProps<"/admin/enquiries">["searchParams"] }) {
  const sp = await searchParams;
  const tab = tabs.find((t) => t.key === sp.show) ?? tabs[0];
  const page = Math.max(1, Number(sp.page) || 1);
  const query = new URLSearchParams({ page: String(page), pageSize: "20" });
  if (tab.handled) query.set("handled", tab.handled);
  const data = await adminGet<Page<AdminEnquiry>>(`/admin/enquiries?${query}`, `/admin/enquiries?show=${tab.key}`);

  return (
    <>
      <nav aria-label="Filter enquiries" className="mb-5 flex gap-2">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={`/admin/enquiries?show=${t.key}`}
            aria-current={t.key === tab.key ? "page" : undefined}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm",
              t.key === tab.key ? "border-primary bg-primary font-semibold text-primary-foreground" : "border-input bg-card hover:border-foreground",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {data.items.length ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {data.items.map((e) => (
            <EnquiryCard key={e.id} enquiry={e} />
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-input bg-card p-8 text-muted-foreground">
          {tab.key === "open" ? "No open enquiries." : "No enquiries here yet."}
        </p>
      )}
      <Pagination
        page={data.page}
        pageSize={data.pageSize}
        total={data.total}
        basePath="/admin/enquiries"
        params={{ show: tab.key }}
      />
    </>
  );
}
