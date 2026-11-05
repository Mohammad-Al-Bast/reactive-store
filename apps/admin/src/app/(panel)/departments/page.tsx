import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronRight, Plus } from "lucide-react";
import type { AdminCategory } from "@reactive-store/shared";

import { DepartmentsSkeleton } from "@/components/admin/skeletons";
import { PageHeader } from "@/components/admin/ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { missingArabic } from "@/lib/admin/format";
import { adminGet } from "@/lib/admin/server";

export const metadata: Metadata = { title: "Departments" };

export default function DepartmentsPage() {
  return (
    <>
      <PageHeader title="Departments">
        <Button asChild>
          <Link href="/departments/new">
            <Plus /> Add department
          </Link>
        </Button>
      </PageHeader>
      <Suspense fallback={<DepartmentsSkeleton />}>
        <Departments />
      </Suspense>
    </>
  );
}

async function Departments() {
  const categories = await adminGet<AdminCategory[]>("/admin/categories", "/departments");
  const missing = categories.filter(missingArabic).length;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Departments group products in the shop menu. Open one to edit its text in English and Arabic and see its products.
        {missing ? ` ${missing} still need${missing === 1 ? "s" : ""} Arabic text.` : ""}
      </p>
      {categories.length ? (
        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead className="w-16 pl-4">#</TableHead>
                <TableHead>Department</TableHead>
                <TableHead className="hidden md:table-cell">Arabic</TableHead>
                <TableHead className="text-right">Products</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((c) => (
                <TableRow key={c.id} className="relative">
                  <TableCell className="pl-4 text-muted-foreground tabular-nums">{c.sortOrder}</TableCell>
                  <TableCell>
                    {/* The whole row is the link, via the stretched ::after. */}
                    <Link href={`/departments/${c.id}`} className="font-semibold after:absolute after:inset-0 hover:text-brand">
                      {c.translations.en?.name ?? c.slug}
                    </Link>
                    <div className="text-[13px] text-muted-foreground">/shop/{c.slug}</div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {missingArabic(c) ? (
                      <Badge className="bg-gold text-gold-foreground">Missing Arabic</Badge>
                    ) : (
                      <span dir="rtl" lang="ar">
                        {c.translations.ar?.name}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{c.productCount}</TableCell>
                  <TableCell>
                    <ChevronRight aria-hidden="true" className="size-4 text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-input bg-card p-8 text-muted-foreground">
          No departments yet. Add one to start organising products.
        </p>
      )}
    </div>
  );
}
