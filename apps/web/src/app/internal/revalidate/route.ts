import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";

import { catalogTags } from "@/lib/catalog";

/**
 * Called by the API after an admin edit: drops cached catalogue data so the change
 * is live at once. Protected by REVALIDATE_SECRET, and Caddy blocks /internal/*
 * from the internet.
 */
export async function POST(request: Request) {
  const secret = process.env.REVALIDATE_SECRET;
  const given = request.headers.get("x-revalidate-secret") ?? "";
  const ok =
    !!secret && given.length === secret.length && timingSafeEqual(Buffer.from(given), Buffer.from(secret));
  if (!ok) return Response.json({ message: "Forbidden" }, { status: 403 });

  const body = (await request.json().catch(() => ({}))) as { tags?: unknown };
  const allowed = new Set<string>([catalogTags.all, catalogTags.categories, catalogTags.products]);
  const tags = Array.isArray(body.tags)
    ? body.tags.filter((t): t is string => typeof t === "string" && (allowed.has(t) || t.startsWith("product:")))
    : [];
  if (!tags.length) return Response.json({ message: "No valid tags" }, { status: 400 });

  for (const tag of tags) revalidateTag(tag, { expire: 0 });
  return Response.json({ revalidated: tags });
}
