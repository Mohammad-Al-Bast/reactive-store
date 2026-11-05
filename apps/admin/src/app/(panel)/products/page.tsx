import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Plus } from "lucide-react";
import { productStatusSchema, type AdminCategory, type AdminProductListItem } from "@reactive-store/shared";

import { ProductsSkeleton } from "@/components/admin/skeletons";
import { ProductList } from "@/components/admin/product-list";
import { PageHeader } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { adminGet } from "@/lib/admin/server";

export const metadata: Metadata = { title: "Products" };

export default function ProductsPage({ searchParams }: PageProps<"/products">) {
  return (
    <>
      <PageHeader title="Products">
        <Button asChild>
          <Link href="/products/new">
            <Plus /> New product
          </Link>
        </Button>
      </PageHeader>
      <Suspense fallback={<ProductsSkeleton />}>
        <Products searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Products({ searchParams }: { searchParams: PageProps<"/products">["searchParams"] }) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;
  const status = productStatusSchema.safeParse(one(sp.status)).data;
  const categoryId = one(sp.department);
  const q = one(sp.q);

  const query = new URLSearchParams();
  if (status) query.set("status", status);
  if (categoryId && /^[0-9a-f-]{36}$/.test(categoryId)) query.set("categoryId", categoryId);
  if (q) query.set("q", q);
  const returnTo = `/products?${new URLSearchParams(Object.entries({ status, department: categoryId, q }).filter((e): e is [string, string] => !!e[1]))}`;
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

      <ProductList products={products} />
    </>
  );
}
