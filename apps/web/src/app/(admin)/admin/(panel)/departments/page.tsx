import type { Metadata } from "next";
import { Suspense } from "react";
import type { AdminCategory } from "@reactive-store/shared";

import { DepartmentsEditor } from "@/components/admin/departments-editor";
import { LoadingBlock, PageHeader } from "@/components/admin/ui";
import { adminGet } from "@/lib/admin/server";

export const metadata: Metadata = { title: "Departments" };

export default function DepartmentsPage() {
  return (
    <>
      <PageHeader title="Departments" />
      <Suspense fallback={<LoadingBlock />}>
        <Departments />
      </Suspense>
    </>
  );
}

async function Departments() {
  const categories = await adminGet<AdminCategory[]>("/admin/categories", "/admin/departments");
  return <DepartmentsEditor initial={categories} />;
}
