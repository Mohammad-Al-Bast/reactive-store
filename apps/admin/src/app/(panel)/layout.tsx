import { Suspense } from "react";
import type { AdminProfile } from "@reactive-store/shared";

import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { adminGet } from "@/lib/admin/server";

/** The sidebar with the signed-in admin. Redirects to sign-in if the session is gone. */
async function SidebarWithUser() {
  const me = await adminGet<AdminProfile>("/auth/me", "/");
  return <AppSidebar user={{ name: me.name, email: me.email }} />;
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
      <Suspense fallback={<AppSidebar user={null} />}>
        <SidebarWithUser />
      </Suspense>
      <SidebarInset>
        <Suspense fallback={<div className="h-(--header-height) border-b" />}>
          <SiteHeader />
        </Suspense>
        <main className="@container/main mx-auto w-full max-w-7xl flex-1 px-4 py-6 lg:px-6 lg:py-8">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
