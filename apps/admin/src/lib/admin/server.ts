import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const API_URL = process.env.API_INTERNAL_URL ?? "http://localhost:3001";
const ADMIN_COOKIE = "rs_admin";

/**
 * GET from the admin API on the server, forwarding the admin's session cookie.
 * Never cached. Without a valid session it redirects to sign-in, which refreshes
 * the session if it can and comes back to `returnTo`.
 */
export async function adminGet<T>(path: string, returnTo: string): Promise<T> {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  const login = `/login?next=${encodeURIComponent(returnTo)}`;
  if (!token) redirect(login);

  const res = await fetch(`${API_URL}/api${path}`, {
    headers: { accept: "application/json", cookie: `${ADMIN_COOKIE}=${token}` },
    cache: "no-store",
  });
  if (res.status === 401) redirect(login);
  if (!res.ok) throw new Error(`Admin API ${res.status} on GET ${path}`);
  return (await res.json()) as T;
}

/** Like adminGet, but returns null on 404 so pages can call notFound(). */
export async function adminGetOrNull<T>(path: string, returnTo: string): Promise<T | null> {
  try {
    return await adminGet<T>(path, returnTo);
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("Admin API 404")) return null;
    throw err;
  }
}
