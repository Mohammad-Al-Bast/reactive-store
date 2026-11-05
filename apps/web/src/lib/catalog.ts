import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import type { Category, Locale, Product } from "@reactive-store/shared";

/**
 * Catalogue reads for server components. Everything comes from the API; the web
 * app has no database access.
 *
 * Results are cached and tagged so the API can refresh them after an admin edit
 * (POST /internal/revalidate, Phase 3). Until then they refresh every hour.
 */

const API_URL = process.env.API_INTERNAL_URL ?? "http://localhost:3001";

export const catalogTags = {
  all: "catalog",
  categories: "categories",
  products: "products",
  product: (slug: string) => `product:${slug}`,
} as const;

async function apiGet<T>(path: string): Promise<T | null> {
  const res = await fetch(`${API_URL}/api${path}`, { headers: { accept: "application/json" } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`API ${res.status} on GET ${path}`);
  return (await res.json()) as T;
}

export async function getCategories(locale: Locale): Promise<Category[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(catalogTags.all, catalogTags.categories);
  return (await apiGet<Category[]>(`/categories?locale=${locale}`)) ?? [];
}

export async function getCategory(slug: string, locale: Locale): Promise<Category | undefined> {
  return (await getCategories(locale)).find((c) => c.slug === slug);
}

/** Published products, optionally in one category. */
export async function getProducts(locale: Locale, category?: string): Promise<Product[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(catalogTags.all, catalogTags.products);
  const query = new URLSearchParams({ locale });
  if (category) query.set("category", category);
  return (await apiGet<Product[]>(`/products?${query}`)) ?? [];
}

export async function getProduct(slug: string, locale: Locale): Promise<Product | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(catalogTags.all, catalogTags.products, catalogTags.product(slug));
  return apiGet<Product>(`/products/${encodeURIComponent(slug)}?locale=${locale}`);
}
