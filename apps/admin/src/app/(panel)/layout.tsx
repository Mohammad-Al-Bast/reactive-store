import { Suspense } from "react";

import { AdminNav, AdminNavLinks } from "@/components/admin/admin-nav";
import { AdminUser } from "@/components/admin/admin-user";

/** Shell for every signed-in admin page: navigation plus the signed-in admin. */
export default function PanelLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-svh flex-col lg:flex-row">
      <aside className="border-b border-border bg-ink text-ink-text lg:sticky lg:top-0 lg:h-svh lg:w-60 lg:shrink-0 lg:border-b-0">
        <div className="flex h-full flex-col gap-4 p-4 lg:p-5">
          <div className="font-serif text-lg text-white">
            Reactive Store <span className="text-sm text-ink-text">Admin</span>
          </div>
          <Suspense fallback={<AdminNavLinks />}>
            <AdminNav />
          </Suspense>
          <div className="mt-auto hidden lg:block">
            <Suspense fallback={<div className="h-20" />}>
              <AdminUser />
            </Suspense>
          </div>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <div className="border-b border-border bg-card px-4 py-2 lg:hidden">
          <Suspense fallback={<div className="h-8" />}>
            <AdminUser compact />
          </Suspense>
        </div>
        <main className="mx-auto w-full max-w-6xl px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
