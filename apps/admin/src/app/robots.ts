import type { MetadataRoute } from "next";

/** The admin site is never indexed. */
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
