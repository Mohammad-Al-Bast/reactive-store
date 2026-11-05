"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Inbox, PlusCircle } from "lucide-react";

import { adminSections, isActive } from "@/components/admin-nav";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

/** "New product" plus the panel's sections, with the current one highlighted. */
export function NavMain() {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  // On phones the sidebar is a drawer: close it once a link is chosen.
  const done = () => {
    if (isMobile) setOpenMobile(false);
  };

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          <SidebarMenuItem className="flex items-center gap-2">
            <SidebarMenuButton
              asChild
              tooltip="New product"
              className="min-w-8 bg-sidebar-primary font-semibold text-sidebar-primary-foreground duration-200 ease-linear hover:bg-sidebar-primary/90 hover:text-sidebar-primary-foreground active:bg-sidebar-primary/90 active:text-sidebar-primary-foreground"
            >
              <Link href="/products/new" onClick={done}>
                <PlusCircle />
                <span>New product</span>
              </Link>
            </SidebarMenuButton>
            <Link
              href="/enquiries"
              onClick={done}
              className="flex size-8 shrink-0 items-center justify-center rounded-md border border-sidebar-border hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:hidden"
            >
              <Inbox className="size-4" />
              <span className="sr-only">Enquiries</span>
            </Link>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarMenu>
          {adminSections.map((section) => {
            const active = isActive(section, pathname);
            return (
              <SidebarMenuItem key={section.href}>
                <SidebarMenuButton
                  asChild
                  tooltip={section.title}
                  isActive={active}
                  className="data-[active=true]:font-semibold data-[active=true]:text-white data-[active=true]:[&>svg]:text-gold"
                >
                  <Link href={section.href} aria-current={active ? "page" : undefined} onClick={done}>
                    <section.icon />
                    <span>{section.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
