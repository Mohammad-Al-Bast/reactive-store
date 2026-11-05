import { NextResponse, type NextRequest } from "next/server";

/** Name of the API's admin access cookie (see apps/api/src/auth/auth.constants.ts). */
const ADMIN_COOKIE = "rs_admin";

/**
 * Without a session cookie, go to the sign-in page. This is only for convenience;
 * the API checks every request itself. The sign-in page refreshes an expired
 * session from the refresh cookie and comes straight back.
 */
export default function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (pathname === "/login" || request.cookies.has(ADMIN_COOKIE)) return NextResponse.next();
  const login = new URL("/login", request.url);
  if (pathname !== "/") login.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(login);
}

export const config = {
  // Skip the API, uploads, Next internals, and anything with a file extension.
  matcher: "/((?!api|uploads|_next|.*\\..*).*)",
};
