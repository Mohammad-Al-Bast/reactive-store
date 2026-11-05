import { NextResponse, type NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

const intl = createMiddleware(routing);

/** Name of the API's admin access cookie (see apps/api/src/auth/auth.constants.ts). */
const ADMIN_COOKIE = "rs_admin";

export default function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Admin panel: English only, no locale prefix. Without a session cookie, go to the
  // sign-in page. This is only for convenience; the API checks every request itself.
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const isLogin = pathname === "/admin/login";
    if (!isLogin && !request.cookies.has(ADMIN_COOKIE)) {
      const login = new URL("/admin/login", request.url);
      login.searchParams.set("next", `${pathname}${search}`);
      return NextResponse.redirect(login);
    }
    const res = NextResponse.next();
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
    return res;
  }

  // Store: adds the locale prefix (/shop → /en/shop) and keeps it on every request.
  return intl(request);
}

export const config = {
  // Skip the API, Next internals, and anything with a file extension (images, icons).
  matcher: "/((?!api|internal|_next|_vercel|.*\\..*).*)",
};
