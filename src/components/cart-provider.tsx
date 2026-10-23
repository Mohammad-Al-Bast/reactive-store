"use client";

import * as React from "react";

import { getProduct, type Product } from "@/lib/products";

export type CartLine = { slug: string; qty: number };
type CartLineWithProduct = CartLine & { product: Product };

type CartContextValue = {
  lines: CartLineWithProduct[];
  count: number;
  /** Sum of known prices; lines with "price on request" are excluded. */
  subtotal: number;
  hasUnpriced: boolean;
  /** False during the server render and hydration, before the saved cart is read. */
  ready: boolean;
  add: (slug: string, qty?: number) => void;
  setQty: (slug: string, qty: number) => void;
  remove: (slug: string) => void;
  clear: () => void;
};

/* ---------- A tiny external store backed by localStorage ---------- */

const STORAGE_KEY = "reactive-store-cart";
const EMPTY: CartLine[] = [];
const listeners = new Set<() => void>();
let current: CartLine[] | null = null;

function readStored(): CartLine[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as CartLine[]) : [];
    return Array.isArray(parsed) ? parsed.filter((l) => getProduct(l.slug) && l.qty > 0) : [];
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

/* ---------- React context ---------- */

const CartContext = React.createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const lines = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const ready = React.useSyncExternalStore(noopSubscribe, () => true, () => false);

  const value = React.useMemo<CartContextValue>(() => {
    const withProduct = lines
      .map((l) => ({ ...l, product: getProduct(l.slug) }))
      .filter((l): l is CartLineWithProduct => Boolean(l.product));
    return {
      lines: withProduct,
      ready,
      count: withProduct.reduce((n, l) => n + l.qty, 0),
      subtotal: withProduct.reduce((s, l) => s + (l.product.price ?? 0) * l.qty, 0),
      hasUnpriced: withProduct.some((l) => l.product.price == null),
      add: (slug, qty = 1) => {
        const prev = getSnapshot();
        const found = prev.find((l) => l.slug === slug);
        write(found ? prev.map((l) => (l.slug === slug ? { ...l, qty: l.qty + qty } : l)) : [...prev, { slug, qty }]);
      },
      setQty: (slug, qty) => {
        const prev = getSnapshot();
        write(qty <= 0 ? prev.filter((l) => l.slug !== slug) : prev.map((l) => (l.slug === slug ? { ...l, qty } : l)));
      },
      remove: (slug) => write(getSnapshot().filter((l) => l.slug !== slug)),
      clear: () => write([]),
    };
  }, [lines, ready]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = React.useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
