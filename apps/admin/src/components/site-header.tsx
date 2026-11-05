"use client";

import { usePathname } from "next/navigation";
import { ExternalLink } from "lucide-react";

import { sectionFor } from "@/components/admin-nav";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { storeUrl } from "@/lib/store";

/** Top bar: sidebar toggle, the current section and a link to the store. */
export function SiteHeader() {
  const section = sectionFor(usePathname());
  return (
    <header className="sticky top-0 z-10 flex h-(--header-height) shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur transition-[width,height] ease-linear">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1 size-8" />
        <Separator orientation="vertical" className="mx-2 data-[orientation=vertical]:h-4" />
        <span className="text-base font-semibold">{section?.title ?? "Admin"}</span>
        <a
          href={storeUrl()}
          target="_blank"
          rel="noreferrer"
          className="ml-auto hidden items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold text-brand hover:bg-muted sm:inline-flex"
        >
          View store <ExternalLink className="size-3.5" />
        </a>
      </div>
    </header>
  );
}
