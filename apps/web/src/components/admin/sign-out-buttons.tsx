"use client";

import * as React from "react";
import { LogOut } from "lucide-react";

import { adminRequest } from "@/lib/admin/client";
import { cn } from "@/lib/utils";

export function SignOutButtons({ compact = false }: { compact?: boolean }) {
  const [busy, setBusy] = React.useState(false);

  async function signOut(everywhere: boolean) {
    if (everywhere && !window.confirm("Sign out on every device, including this one?")) return;
    setBusy(true);
    if (everywhere) await adminRequest("POST", "/auth/logout-all");
    else await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    // A full page load on purpose: it drops everything rendered for the old session.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/admin/login");
  }

  const link = "inline-flex items-center gap-1.5 rounded px-1 py-0.5 hover:underline disabled:opacity-50";
  return (
    <div className={cn("flex flex-wrap gap-x-3 gap-y-1", compact ? "text-sm" : "text-[13px]")}>
      <button type="button" className={link} disabled={busy} onClick={() => signOut(false)}>
        <LogOut aria-hidden="true" className="size-3.5" /> Sign out
      </button>
      {compact ? null : (
        <button type="button" className={link} disabled={busy} onClick={() => signOut(true)}>
          Sign out everywhere
        </button>
      )}
    </div>
  );
}
