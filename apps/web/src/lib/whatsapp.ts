import { formatPrice, site } from "@/lib/site";
import type { Product } from "@/lib/products";

export type OrderDetails = {
  name: string;
  phone: string;
  governorate: string;
  city: string;
  address: string;
  payment: string;
  notes?: string;
};

export type OrderLine = { qty: number; product: Product };

export function makeOrderId() {
  const d = new Date();
  const stamp = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `RS-${stamp}-${rand}`;
}

/** The order as a plain-text WhatsApp message the store can read at a glance. */
export function buildOrderMessage(orderId: string, lines: OrderLine[], d: OrderDetails) {
  const payment = site.paymentMethods.find((p) => p.id === d.payment)?.name ?? d.payment;
  const subtotal = lines.reduce((s, l) => s + (l.product.price ?? 0) * l.qty, 0);
  const unpriced = lines.some((l) => l.product.price == null);

  const items = lines.map((l) => {
    const price = l.product.price == null ? "price on request" : formatPrice(l.product.price * l.qty);
    return `• ${l.qty} × ${l.product.name} — ${price}`;
  });

  return [
    `New order ${orderId} — ${site.name}`,
    "",
    ...items,
    "",
    `Subtotal: ${subtotal > 0 ? formatPrice(subtotal) : "to be confirmed"}${unpriced && subtotal > 0 ? " + items on request" : ""}`,
    `Payment: ${payment}`,
    "",
    `Name: ${d.name}`,
    `Phone: ${d.phone}`,
    `Area: ${d.city}, ${d.governorate}`,
    `Address: ${d.address}`,
    d.notes ? `Notes: ${d.notes}` : "",
  ]
    .filter((line, i, all) => !(line === "" && all[i - 1] === ""))
    .join("\n")
    .trim();
}

export type EnquiryDetails = { name: string; phone: string; role: string; topic?: string; message: string };

export function buildEnquiryMessage(d: EnquiryDetails) {
  return [
    `Hello ${site.name},`,
    "",
    d.message,
    "",
    `— ${d.name} (${d.role})`,
    d.topic ? `Topic: ${d.topic}` : null,
    `Phone: ${d.phone}`,
  ]
    .filter((line) => line !== null)
    .join("\n");
}
