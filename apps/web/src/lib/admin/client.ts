"use client";

import type { ApiResult } from "@/lib/api-client";

let refreshing: Promise<boolean> | null = null;

/** Swaps the refresh cookie for a new session. Concurrent callers share one request. */
export function refreshSession(): Promise<boolean> {
  refreshing ??= fetch("/api/auth/refresh", { method: "POST" })
    .then((r) => r.ok)
    .catch(() => false)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

function toLogin() {
  const next = `${window.location.pathname}${window.location.search}`;
  // A full page load on purpose: it drops everything rendered for the old session.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.assign(`/admin/login?next=${encodeURIComponent(next)}`);
}

/**
 * Calls the admin API from the browser. If the access cookie has expired, it
 * refreshes the session once and retries; if that fails, it goes to sign-in.
 */
export async function adminRequest<T>(
  method: "POST" | "PATCH" | "DELETE" | "PUT",
  path: string,
  body?: unknown,
): Promise<ApiResult<T>> {
  const send = () =>
    fetch(`/api${path}`, {
      method,
      headers: body === undefined ? { accept: "application/json" } : { "content-type": "application/json", accept: "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

  try {
    let res = await send();
    if (res.status === 401 && (await refreshSession())) res = await send();
    if (res.status === 401) {
      toLogin();
      return { ok: false, status: 401, body: { message: "Please sign in again." } };
    }
    const json = await res.json().catch(() => ({}));
    return res.ok ? { ok: true, status: res.status, data: json as T } : { ok: false, status: res.status, body: json };
  } catch {
    return { ok: false, status: 0, body: { message: "Network error. Check your connection and try again." } };
  }
}
