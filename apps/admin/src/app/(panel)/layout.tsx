import { Suspense } from "react";
import type { AdminCategory, AdminProfile } from "@reactive-store/shared";

import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { missingArabic } from "@/lib/admin/format";
import { adminGet } from "@/lib/admin/server";

/**
 * The sidebar with the signed-in admin and the departments (each has its own
 * page). Redirects to sign-in if the session is gone.
 */
async function SidebarWithUser() {
  const [me, categories] = await Promise.all([
    adminGet<AdminProfile>("/auth/me", "/"),
    adminGet<AdminCategory[]>("/admin/categories", "/"),
  ]);
  const departments = categories.map((c) => ({
    id: c.id,
    name: c.translations.en?.name ?? c.slug,
    missingArabic: missingArabic(c),
  }));
  return <AppSidebar user={{ name: me.name, email: me.email }} departments={departments} />;
}

/** Shell for every signed-in admin page (shadcn dashboard-01 layout, in the store's colours). */
export default function PanelLayout({ children }: LayoutProps<"/">) {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 64)",
          "--header-height": "calc(var(--spacing) * 14)",
        } as React.CSSProperties
      }
    >
      <Suspense fallback={<AppSidebar user={null} departments={null} />}>
        <SidebarWithUser />
      </Suspense>
      <SidebarInset>
        <Suspense
          fallback={
            <div className="flex h-(--header-height) items-center gap-4 border-b px-3 lg:px-6" aria-hidden="true">
              <Skeleton className="size-8" />
              <Skeleton className="h-4 w-28" />
            </div>
          }
        >
          <SiteHeader />
        </Suspense>
        <main className="@container/main w-full flex-1 p-3 lg:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
