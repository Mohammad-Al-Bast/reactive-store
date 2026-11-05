"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { storeUrl } from "@/lib/store";

/** The panel's sidebar: brand, sections, a link to the store and the signed-in admin. */
export function AppSidebar({
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & { user: { name: string; email: string } | null }) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg" className="hover:bg-transparent active:bg-transparent">
              <Link href="/">
                <Image src="/images/logo.png" alt="" width={32} height={32} className="size-8 shrink-0 rounded-full" />
                <span className="flex flex-col leading-tight">
                  <span className="font-serif text-lg text-white">Reactive Store</span>
                  <span className="text-[11px] tracking-[0.12em] text-gold uppercase">Admin</span>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain />
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="View store">
                  <a href={storeUrl()} target="_blank" rel="noreferrer">
                    <ExternalLink />
                    <span>View store</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
