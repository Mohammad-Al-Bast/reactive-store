/**
 * Catalogue types. The products themselves live in the database and are read
 * through `@/lib/catalog` (server) or the cart (browser). Stock and audience
 * labels are translated: see "Stock" and "Audience" in the message files.
 */
import type { Audience } from "@reactive-store/shared";

export type { Audience, Category, Product, Stock } from "@reactive-store/shared";

/** Audience ids in the order the shop filters list them. */
export const audiences: Audience[] = ["clinic", "home", "student"];
