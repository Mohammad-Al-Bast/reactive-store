import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

/**
 * Adds the locale prefix (/shop → /en/shop) and keeps it on every request.
 * The admin panel is a separate site (apps/admin), so nothing here handles /admin.
 */
export default createMiddleware(routing);

export const config = {
  // Skip the API, uploads, Next internals, and anything with a file extension (images, icons).
  matcher: "/((?!api|uploads|internal|_next|_vercel|.*\\..*).*)",
};
