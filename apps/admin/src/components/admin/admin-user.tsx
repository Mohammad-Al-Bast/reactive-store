import type { AdminProfile } from "@reactive-store/shared";

import { SignOutButtons } from "@/components/admin/sign-out-buttons";
import { adminGet } from "@/lib/admin/server";

/** The signed-in admin and sign-out actions. Redirects to sign-in if the session is gone. */
export async function AdminUser({ compact = false }: { compact?: boolean }) {
  const me = await adminGet<AdminProfile>("/auth/me", "/");
  return compact ? (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="truncate">{me.name}</span>
      <SignOutButtons compact />
    </div>
  ) : (
    <div className="flex flex-col gap-2 border-t border-ink-line pt-4 text-sm">
      <div className="leading-tight">
        <div className="font-semibold text-white">{me.name}</div>
        <div className="truncate text-[13px]">{me.email}</div>
      </div>
      <SignOutButtons />
    </div>
  );
}
