/**
 * Links from the admin site to the public store. The store is a separate site
 * (e.g. https://yourstore.com), set at build time with NEXT_PUBLIC_STORE_URL.
 */
const STORE_URL = (process.env.NEXT_PUBLIC_STORE_URL || "http://localhost:3000").replace(/\/$/, "");
const LOCALE = "en";

/** `storeUrl("/product/tens")` → "https://yourstore.com/en/product/tens". */
export function storeUrl(path = "/") {
  return `${STORE_URL}/${LOCALE}${path === "/" ? "" : path}`;
}
