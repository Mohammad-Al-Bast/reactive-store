"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Inbox, Plus, PlusCircle } from "lucide-react";

import { adminSections, isActive, type AdminSection } from "@/components/admin-nav";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";

/** A department as the side menu lists it. */
export type NavDepartment = { id: string; name: string; missingArabic: boolean };

const activeClass =
  "data-[active=true]:font-semibold data-[active=true]:text-white data-[active=true]:[&>svg]:text-gold";

/** "New product" plus the panel's sections, with the current one highlighted. */
export function NavMain({ departments }: { departments: NavDepartment[] | null }) {
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
          {adminSections.map((section) =>
            section.href === "/departments" ? (
              <DepartmentsItem
                key={section.href}
                section={section}
                departments={departments}
                pathname={pathname}
                onNavigate={done}
              />
            ) : (
              <SidebarMenuItem key={section.href}>
                <SidebarMenuButton asChild tooltip={section.title} isActive={isActive(section, pathname)} className={activeClass}>
                  <Link href={section.href} aria-current={isActive(section, pathname) ? "page" : undefined} onClick={done}>
                    <section.icon />
                    <span>{section.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ),
          )}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

/** "Departments", with each department as its own page underneath. */
function DepartmentsItem({
  section,
  departments,
  pathname,
  onNavigate,
}: {
  section: AdminSection;
  /** null while loading. */
  departments: NavDepartment[] | null;
  pathname: string;
  onNavigate: () => void;
}) {
  const [open, setOpen] = React.useState(true);
  const overview = pathname === "/departments";

  return (
    <Collapsible asChild open={open} onOpenChange={setOpen}>
      <SidebarMenuItem>
        <SidebarMenuButton asChild tooltip={section.title} isActive={overview} className={activeClass}>
          <Link href={section.href} aria-current={overview ? "page" : undefined} onClick={onNavigate}>
            <section.icon />
            <span>{section.title}</span>
          </Link>
        </SidebarMenuButton>
        <CollapsibleTrigger asChild>
          <SidebarMenuAction className="transition-transform data-[state=open]:rotate-90">
            <ChevronRight />
            <span className="sr-only">{open ? "Hide departments" : "Show departments"}</span>
          </SidebarMenuAction>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {departments === null
              ? [72, 56, 64, 48].map((w) => (
                  <SidebarMenuSubItem key={w} aria-hidden="true">
                    <div className="flex h-7 items-center px-2">
                      <Skeleton className="h-3 bg-sidebar-border" style={{ width: `${w}%` }} />
                    </div>
                  </SidebarMenuSubItem>
                ))
              : departments.map((d) => {
              const href = `/departments/${d.id}`;
              const active = pathname === href;
              return (
                <SidebarMenuSubItem key={d.id}>
                  <SidebarMenuSubButton asChild isActive={active} className="data-[active=true]:font-semibold">
                    <Link href={href} aria-current={active ? "page" : undefined} onClick={onNavigate}>
                      <span className="truncate">{d.name}</span>
                      {d.missingArabic ? (
                        <span className="ml-auto size-1.5 shrink-0 rounded-full bg-gold" title="Missing Arabic text">
                          <span className="sr-only">(missing Arabic)</span>
                        </span>
                      ) : null}
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              );
            })}
            <SidebarMenuSubItem>
              <SidebarMenuSubButton asChild isActive={pathname === "/departments/new"} className="opacity-80">
                <Link href="/departments/new" onClick={onNavigate}>
                  <Plus />
                  <span>Add department</span>
                </Link>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}
