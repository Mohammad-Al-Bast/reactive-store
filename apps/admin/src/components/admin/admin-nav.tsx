"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ExternalLink, FolderTree, Inbox, LayoutDashboard, Package, ShoppingBag } from "lucide-react";

import { cn } from "@/lib/utils";
import { storeUrl } from "@/lib/store";

const items = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/orders", label: "Orders", icon: ShoppingBag },
  { href: "/enquiries", label: "Enquiries", icon: Inbox },
  { href: "/products", label: "Products", icon: Package },
  { href: "/departments", label: "Departments", icon: FolderTree },
];

/** Highlights the current section. Reads the URL, so render it inside <Suspense>. */
export function AdminNav() {
  return <AdminNavLinks pathname={usePathname()} />;
}

/** The links on their own; with no pathname, nothing is highlighted (Suspense fallback). */
export function AdminNavLinks({ pathname }: { pathname?: string }) {
  return (
    <nav aria-label="Admin" className="flex gap-1 overflow-x-auto lg:flex-col">
      {items.map(({ href, label, icon: Icon, exact }) => {
        const active = pathname !== undefined && (exact ? pathname === href : pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2.5 rounded-md px-3 py-2 text-[15px] transition-colors",
              active ? "bg-ink-raised font-semibold text-white" : "hover:bg-ink-raised hover:text-white",
            )}
          >
            <Icon aria-hidden="true" className="size-4.5" />
            {label}
          </Link>
        );
      })}
      <a
        href={storeUrl()}
        target="_blank"
        rel="noreferrer"
        className="flex shrink-0 items-center gap-2.5 rounded-md px-3 py-2 text-[15px] hover:bg-ink-raised hover:text-white"
      >
        <ExternalLink aria-hidden="true" className="size-4.5" />
        View store
      </a>
    </nav>
  );
}
