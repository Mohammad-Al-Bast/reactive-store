import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, ExternalLink, Plus } from "lucide-react";
import type { AdminCategory, AdminProductListItem } from "@reactive-store/shared";

import { DepartmentSkeleton } from "@/components/admin/skeletons";
import { DepartmentForm } from "@/components/admin/department-form";
import { ProductList } from "@/components/admin/product-list";
import { Button } from "@/components/ui/button";
import { adminGet } from "@/lib/admin/server";
import { storeUrl } from "@/lib/store";

const uuid = /^[0-9a-f-]{36}$/;

export const metadata: Metadata = { title: "Department" };

/** One department: its text in both languages, then its products. /departments/new creates one. */
export default function DepartmentPage({ params }: PageProps<"/departments/[id]">) {
  return (
    <>
      <Link href="/departments" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft aria-hidden="true" className="size-4" /> All departments
      </Link>
      <Suspense fallback={<DepartmentSkeleton />}>
        <Department params={params} />
      </Suspense>
    </>
  );
}

async function Department({ params }: { params: PageProps<"/departments/[id]">["params"] }) {
  const { id } = await params;
  const returnTo = `/departments/${id}`;

  if (id === "new") {
    const categories = await adminGet<AdminCategory[]>("/admin/categories", returnTo);
    const nextOrder = Math.max(0, ...categories.map((c) => c.sortOrder)) + 1;
    return (
      <div className="flex flex-col gap-6">
        <h1 className="display text-[clamp(1.75rem,3vw,2.25rem)] leading-tight">New department</h1>
        <DepartmentForm initial={null} nextOrder={nextOrder} />
      </div>
    );
  }

  if (!uuid.test(id)) notFound();
  const [categories, products] = await Promise.all([
    adminGet<AdminCategory[]>("/admin/categories", returnTo),
    adminGet<AdminProductListItem[]>(`/admin/products?categoryId=${id}`, returnTo),
  ]);
  const category = categories.find((c) => c.id === id);
  if (!category) notFound();
  const name = category.translations.en?.name ?? category.slug;
  const published = products.filter((p) => p.status === "published").length;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="display text-[clamp(1.75rem,3vw,2.25rem)] leading-tight">{name}</h1>
          {category.translations.ar?.name ? (
            <p dir="rtl" lang="ar" className="mt-1 text-lg text-muted-foreground">
              {category.translations.ar.name}
            </p>
          ) : null}
        </div>
        <Button asChild variant="secondary">
          <a href={storeUrl(`/shop/${category.slug}`)} target="_blank" rel="noreferrer">
            View in store <ExternalLink />
          </a>
        </Button>
      </div>

      {/* Keyed by id, so moving between departments in the side menu starts a fresh form. */}
      <DepartmentForm key={category.id} initial={category} />

      <section aria-labelledby="dept-products" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="dept-products" className="text-lg font-bold">
              Products in this department
            </h2>
            <p className="text-sm text-muted-foreground">
              {products.length} product{products.length === 1 ? "" : "s"}, {published} published
            </p>
          </div>
          <Button asChild variant="secondary">
            <Link href="/products/new">
              <Plus /> New product
            </Link>
          </Button>
        </div>
        <ProductList products={products} showDepartment={false} empty="No products in this department yet." />
      </section>
    </div>
  );
}
