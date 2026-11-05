import type { Metadata } from "next";
import { Suspense } from "react";
import { orderStatusSchema, type AdminOrderListItem, type Page } from "@reactive-store/shared";

import { OrderTable } from "@/components/admin/order-table";
import { LoadingBlock, PageHeader, Pagination } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { orderStatusLabel } from "@/lib/admin/format";
import { adminGet } from "@/lib/admin/server";

export const metadata: Metadata = { title: "Orders" };

export default function OrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  return (
    <>
      <PageHeader title="Orders" />
      <Suspense fallback={<LoadingBlock />}>
        <Orders searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Orders({ searchParams }: { searchParams: PageProps<"/admin/orders">["searchParams"] }) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;
  const statusParse = orderStatusSchema.safeParse(one(sp.status));
  const status = statusParse.success ? statusParse.data : undefined;
  const q = one(sp.q);
  const page = Math.max(1, Number(one(sp.page)) || 1);

  const query = new URLSearchParams({ page: String(page), pageSize: "25" });
  if (status) query.set("status", status);
  if (q) query.set("q", q);
  const returnTo = `/admin/orders?${query}`;
  const data = await adminGet<Page<AdminOrderListItem>>(`/admin/orders?${query}`, returnTo);

  return (
    <>
      <form method="get" role="search" className="mb-5 flex flex-wrap items-end gap-3">
        <div className="grid gap-1.5">
          <label htmlFor="status" className="text-sm font-semibold">
            Status
          </label>
          <NativeSelect id="status" name="status" defaultValue={status ?? ""} className="w-48">
            <option value="">All statuses</option>
            {orderStatusSchema.options.map((s) => (
              <option key={s} value={s}>
                {orderStatusLabel[s]}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="grid min-w-56 flex-1 gap-1.5">
          <label htmlFor="q" className="text-sm font-semibold">
            Search
          </label>
          <Input id="q" name="q" type="search" defaultValue={q} placeholder="Order number, name or phone" />
        </div>
        <Button type="submit" variant="secondary">
          Filter
        </Button>
      </form>
      <OrderTable orders={data.items} />
      <Pagination
        page={data.page}
        pageSize={data.pageSize}
        total={data.total}
        basePath="/admin/orders"
        params={{ status, q }}
      />
    </>
  );
}
