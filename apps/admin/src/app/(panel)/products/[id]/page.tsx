import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import type { AdminCategory, AdminProduct, AdminProductListItem } from "@reactive-store/shared";

import { ProductEditorSkeleton } from "@/components/admin/skeletons";
import { ProductEditor } from "@/components/admin/product-editor";

import { adminGet, adminGetOrNull } from "@/lib/admin/server";

export const metadata: Metadata = { title: "Edit product" };

/** Edits a product, or creates one at /admin/products/new. */
export default function ProductPage({ params }: PageProps<"/products/[id]">) {
  return (
    <>
      <Link href="/products" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft aria-hidden="true" className="size-4" /> All products
      </Link>
      <Suspense fallback={<ProductEditorSkeleton />}>
        <Editor params={params} />
      </Suspense>
    </>
  );
}

async function Editor({ params }: { params: PageProps<"/products/[id]">["params"] }) {
  const { id } = await params;
  const isNew = id === "new";
  if (!isNew && !/^[0-9a-f-]{36}$/.test(id)) notFound();
  const returnTo = `/products/${id}`;

  const [product, categories, all] = await Promise.all([
    isNew ? null : adminGetOrNull<AdminProduct>(`/admin/products/${id}`, returnTo),
    adminGet<AdminCategory[]>("/admin/categories", returnTo),
    adminGet<AdminProductListItem[]>("/admin/products", returnTo),
  ]);
  if (!isNew && !product) notFound();

  return (
    <ProductEditor
      // A fresh form per product; after a save the editor updates itself.
      key={product?.id ?? "new"}
      product={product}
      categories={categories}
      allProducts={all.map((p) => ({ slug: p.slug, name: p.name, status: p.status }))}
    />
  );
}
