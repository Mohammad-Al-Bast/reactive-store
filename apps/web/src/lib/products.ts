/**
 * Catalogue types and display labels. The products themselves now live in the
 * database and are read through `@/lib/catalog` (server) or the cart (browser).
 */
import type { Audience, Stock } from "@reactive-store/shared";

export type { Audience, Category, Product, Stock } from "@reactive-store/shared";

export const stockLabel: Record<Stock, string> = {
  "in-stock": "In stock",
  "low-stock": "Low stock",
  "to-order": "Available to order",
};

export const audienceLabel: Record<Audience, string> = {
  clinic: "Clinic & professional use",
  home: "Home use",
  student: "Students & training",
};
