import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AlertTriangle, ImageIcon, Plus } from "lucide-react";
import { productStatusSchema, type AdminCategory, type AdminProductListItem } from "@reactive-store/shared";

import { LoadingBlock, PageHeader } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { adminGet } from "@/lib/admin/server";
import { stockLabel } from "@/lib/products";
import { formatPrice } from "@/lib/site";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Products" };

export default function ProductsPage({ searchParams }: PageProps<"/admin/products">) {
  return (
    <>
      <PageHeader title="Products">
        <Button asChild>
          <Link href="/admin/products/new">
            <Plus /> New product
          </Link>
        </Button>
      </PageHeader>
      <Suspense fallback={<LoadingBlock />}>
        <Products searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Products({ searchParams }: { searchParams: PageProps<"/admin/products">["searchParams"] }) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;
  const status = productStatusSchema.safeParse(one(sp.status)).data;
  const categoryId = one(sp.department);
  const q = one(sp.q);

  const query = new URLSearchParams();
  if (status) query.set("status", status);
  if (categoryId && /^[0-9a-f-]{36}$/.test(categoryId)) query.set("categoryId", categoryId);
  if (q) query.set("q", q);
  const returnTo = `/admin/products?${new URLSearchParams(Object.entries({ status, department: categoryId, q }).filter((e): e is [string, string] => !!e[1]))}`;
  const [products, categories] = await Promise.all([
    adminGet<AdminProductListItem[]>(`/admin/products?${query}`, returnTo),
    adminGet<AdminCategory[]>("/admin/categories", returnTo),
  ]);

  return (
    <>
      <form method="get" role="search" className="mb-5 flex flex-wrap items-end gap-3">
        <div className="grid gap-1.5">
          <label htmlFor="status" className="text-sm font-semibold">
            Status
          </label>
          <NativeSelect id="status" name="status" defaultValue={status ?? ""} className="w-40">
            <option value="">All</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </NativeSelect>
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="department" className="text-sm font-semibold">
            Department
          </label>
          <NativeSelect id="department" name="department" defaultValue={categoryId ?? ""} className="w-56">
            <option value="">All departments</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.translations.en?.name ?? c.slug}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="grid min-w-48 flex-1 gap-1.5">
          <label htmlFor="q" className="text-sm font-semibold">
            Search
          </label>
          <Input id="q" name="q" type="search" defaultValue={q} placeholder="Name or web address" />
        </div>
        <Button type="submit" variant="secondary">
          Filter
        </Button>
      </form>

      {products.length ? (
        <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {products.map((p) => (
            <li key={p.id}>
              <Link href={`/admin/products/${p.id}`} className="flex items-center gap-4 p-3 hover:bg-muted/50">
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
                    {p.categoryName} · {formatPrice(p.price)} · {stockLabel[p.stock]}
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
      ) : (
        <p className="rounded-xl border border-dashed border-input bg-card p-8 text-muted-foreground">No products found.</p>
      )}
    </>
  );
}
