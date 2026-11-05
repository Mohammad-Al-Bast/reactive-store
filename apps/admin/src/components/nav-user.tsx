"use client";

import * as React from "react";
import { ExternalLink, LogOut, MoreVertical, ShieldOff } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { adminRequest } from "@/lib/admin/client";
import { storeUrl } from "@/lib/store";

type User = { name: string; email: string };

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

function UserBlock({ user }: { user: User }) {
  return (
    <>
      <Avatar className="size-8 rounded-lg">
        <AvatarFallback className="rounded-lg bg-gold font-semibold text-gold-foreground">
          {initials(user.name) || "?"}
        </AvatarFallback>
      </Avatar>
      <div className="grid flex-1 text-left text-sm leading-tight">
        <span className="truncate font-semibold">{user.name}</span>
        <span className="truncate text-xs opacity-75">{user.email}</span>
      </div>
    </>
  );
}

/** The signed-in admin, with "View store" and the two sign-out actions. */
export function NavUser({ user }: { user: User | null }) {
  const { isMobile } = useSidebar();
  const [busy, setBusy] = React.useState(false);

  async function signOut(everywhere: boolean) {
    if (everywhere && !window.confirm("Sign out on every device, including this one?")) return;
    setBusy(true);
    if (everywhere) await adminRequest("POST", "/auth/logout-all");
    else await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    // A full page load on purpose: it drops everything rendered for the old session.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/login");
  }

  if (!user) {
    return (
      <div className="flex items-center gap-2 p-2" aria-hidden="true">
        <Skeleton className="size-8 shrink-0 rounded-lg bg-sidebar-border" />
        <div className="flex flex-1 flex-col gap-1.5 group-data-[collapsible=icon]:hidden">
          <Skeleton className="h-3 w-24 bg-sidebar-border" />
          <Skeleton className="h-2.5 w-36 bg-sidebar-border" />
        </div>
      </div>
    );
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <UserBlock user={user} />
              <MoreVertical className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="flex items-center gap-2 p-1.5 font-normal">
              <UserBlock user={user} />
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a href={storeUrl()} target="_blank" rel="noreferrer">
                <ExternalLink />
                View store
              </a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled={busy} onSelect={() => signOut(false)}>
              <LogOut />
              Sign out
            </DropdownMenuItem>
            <DropdownMenuItem disabled={busy} onSelect={() => signOut(true)}>
              <ShieldOff />
              Sign out everywhere
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
