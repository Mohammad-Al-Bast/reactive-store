import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// Adds the locale prefix (/shop → /en/shop) and keeps it on every request.
export default createMiddleware(routing);

export const config = {
  // Skip the API, Next internals, and anything with a file extension (images, icons).
  matcher: "/((?!api|internal|_next|_vercel|.*\\..*).*)",
};
