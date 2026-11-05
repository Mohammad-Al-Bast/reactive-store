"use client";

import * as React from "react";
import { useLocale } from "next-intl";
import type { CartResolveResponse } from "@reactive-store/shared";

import type { Product } from "@/lib/products";

export type CartLine = { slug: string; qty: number };
type CartLineWithProduct = CartLine & { product: Product };

type CartContextValue = {
  lines: CartLineWithProduct[];
  /** Total quantity in the saved cart. Known once `hydrated` is true. */
  count: number;
  /** False during the server render and hydration, before the saved cart is read. */
  hydrated: boolean;
  /** Sum of known prices; lines with "price on request" are excluded. */
  subtotal: number;
  hasUnpriced: boolean;
  /**
   * False during the server render and hydration, and while current product
   * details are being fetched from the API.
   */
  ready: boolean;
  /** True when product details could not be loaded; call `retry`. */
  error: boolean;
  retry: () => void;
  /** Forgets loaded product details and fetches them again (e.g. after an order is refused). */
  refresh: () => void;
  add: (slug: string, qty?: number) => void;
  setQty: (slug: string, qty: number) => void;
  remove: (slug: string) => void;
  clear: () => void;
};

/* ---------- A tiny external store backed by localStorage ---------- */

const STORAGE_KEY = "reactive-store-cart";
const MAX_QTY = 99;
const EMPTY: CartLine[] = [];
const listeners = new Set<() => void>();
let current: CartLine[] | null = null;

function isLine(l: unknown): l is CartLine {
  if (!l || typeof l !== "object") return false;
  const { slug, qty } = l as Record<string, unknown>;
  return typeof slug === "string" && slug.length > 0 && Number.isInteger(qty) && (qty as number) > 0;
}

function readStored(): CartLine[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter(isLine).map((l) => ({ slug: l.slug, qty: Math.min(l.qty, MAX_QTY) }))
      : [];
  } catch {
    return [];
  }
}

function getSnapshot() {
  if (current === null) current = readStored();
  return current;
}

function getServerSnapshot() {
  return EMPTY;
}

function emit() {
  listeners.forEach((l) => l());
}

function write(next: CartLine[]) {
  current = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage can be unavailable (private mode); the cart still works for this visit.
  }
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Keep several open tabs in sync.
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      current = readStored();
      emit();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

const noopSubscribe = () => () => {};

/* ---------- Current product details from the API ---------- */

async function resolveCart(locale: string, slugs: string[], signal: AbortSignal) {
  const res = await fetch("/api/cart/resolve", {
    method: "POST",
    headers: { "content-type": "application/json" },
    // Only product details are needed here, so quantities are not sent.
    body: JSON.stringify({ locale, items: slugs.map((slug) => ({ slug, qty: 1 })) }),
    signal,
  });
  if (!res.ok) throw new Error(`Cart lookup failed (${res.status})`);
  return (await res.json()) as CartResolveResponse;
}

/* ---------- React context ---------- */

const CartContext = React.createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const locale = useLocale();
  const lines = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const hydrated = React.useSyncExternalStore(noopSubscribe, () => true, () => false);

  // Product details keyed by `${locale}:${slug}`, filled in by the API.
  const [products, setProducts] = React.useState<Record<string, Product>>({});
  const [failedKey, setFailedKey] = React.useState<string | null>(null);
  const [attempt, setAttempt] = React.useState(0);

  const unresolved = lines.map((l) => l.slug).filter((slug) => !products[`${locale}:${slug}`]);
  const unresolvedKey = unresolved.join(",");

  React.useEffect(() => {
    if (!hydrated || !unresolvedKey) return;
    const controller = new AbortController();
    resolveCart(locale, unresolvedKey.split(","), controller.signal)
      .then(({ lines: found, missing }) => {
        setProducts((prev) => {
          const next = { ...prev };
          for (const { product } of found) next[`${locale}:${product.slug}`] = product;
          return next;
        });
        // Products that were removed or unpublished leave the cart.
        if (missing.length) write(getSnapshot().filter((l) => !missing.includes(l.slug)));
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailedKey(unresolvedKey);
      });
    return () => controller.abort();
  }, [hydrated, unresolvedKey, locale, attempt]);

  const error = failedKey !== null && failedKey === unresolvedKey;
  const ready = hydrated && unresolved.length === 0;

  const value = React.useMemo<CartContextValue>(() => {
    const withProduct = lines
      .map((l) => ({ ...l, product: products[`${locale}:${l.slug}`] }))
      .filter((l): l is CartLineWithProduct => Boolean(l.product));
    return {
      lines: withProduct,
      ready,
      hydrated,
      error,
      retry: () => {
        setFailedKey(null);
        setAttempt((n) => n + 1);
      },
      refresh: () => {
        setProducts({});
        setFailedKey(null);
      },
      count: lines.reduce((n, l) => n + l.qty, 0),
      subtotal: withProduct.reduce((s, l) => s + (l.product.price ?? 0) * l.qty, 0),
      hasUnpriced: withProduct.some((l) => l.product.price == null),
      add: (slug, qty = 1) => {
        const prev = getSnapshot();
        const found = prev.find((l) => l.slug === slug);
        write(
          found
            ? prev.map((l) => (l.slug === slug ? { ...l, qty: Math.min(l.qty + qty, MAX_QTY) } : l))
            : [...prev, { slug, qty: Math.min(qty, MAX_QTY) }],
        );
      },
      setQty: (slug, qty) => {
        const prev = getSnapshot();
        write(
          qty <= 0
            ? prev.filter((l) => l.slug !== slug)
            : prev.map((l) => (l.slug === slug ? { ...l, qty: Math.min(qty, MAX_QTY) } : l)),
        );
      },
      remove: (slug) => write(getSnapshot().filter((l) => l.slug !== slug)),
      clear: () => write([]),
    };
  }, [lines, products, locale, ready, hydrated, error]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = React.useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
