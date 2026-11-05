import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { after } from "next/server";

import { routing } from "@/i18n/routing";
import { catalogTags } from "@/lib/catalog";

/** Store pages the API may ask to warm, without the locale prefix. */
const WARMABLE = /^\/(?:|shop|shop\/[a-z0-9-]+|product\/[a-z0-9-]+)$/;

/**
 * Called by the API after an admin edit: drops cached catalogue data so the change
 * is live at once. Protected by REVALIDATE_SECRET, and Caddy blocks /internal/*
 * from the internet.
 *
 * Next serves the previous version once while it re-renders, so the affected
 * pages are requested here straight away. The admin's next visit then sees the
 * new version instead of that one stale view.
 */
export async function POST(request: Request) {
  const secret = process.env.REVALIDATE_SECRET;
  const given = request.headers.get("x-revalidate-secret") ?? "";
  const ok =
    !!secret && given.length === secret.length && timingSafeEqual(Buffer.from(given), Buffer.from(secret));
  if (!ok) return Response.json({ message: "Forbidden" }, { status: 403 });

  const body = (await request.json().catch(() => ({}))) as { tags?: unknown; paths?: unknown };
  const allowed = new Set<string>([catalogTags.all, catalogTags.categories, catalogTags.products]);
  const tags = Array.isArray(body.tags)
    ? body.tags.filter((t): t is string => typeof t === "string" && (allowed.has(t) || t.startsWith("product:")))
    : [];
  if (!tags.length) return Response.json({ message: "No valid tags" }, { status: 400 });
  const paths = Array.isArray(body.paths)
    ? [...new Set(body.paths.filter((p): p is string => typeof p === "string" && WARMABLE.test(p)))].slice(0, 10)
    : [];

  for (const tag of tags) revalidateTag(tag, { expire: 0 });

  const origin = new URL(request.url).origin;
  after(async () => {
    const urls = routing.locales.flatMap((locale) => paths.map((p) => `${origin}/${locale}${p === "/" ? "" : p}`));
    await Promise.allSettled(urls.map((url) => fetch(url, { cache: "no-store" }).then((r) => r.arrayBuffer())));
  });

  return Response.json({ revalidated: tags, warming: paths });
}
