import type { OrderSummary } from "./forms.js";

/** USD amount as the store shows it, e.g. "$70" or "$12.50". */
export function formatUsd(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * The order as a plain-text message the store can read at a glance. Used for the
 * customer's optional WhatsApp message and the store's email alert.
 */
export function buildOrderMessage(
  order: OrderSummary,
  opts: { storeName: string; paymentLabel: string },
) {
  const { customer: c } = order;
  const items = order.items.map((l) => {
    const price = l.unitPrice == null ? "price on request" : formatUsd(l.unitPrice * l.qty);
    return `• ${l.qty} × ${l.name} — ${price}`;
  });
  const subtotal =
    order.subtotal > 0
      ? `${formatUsd(order.subtotal)}${order.totalToConfirm ? " + items on request" : ""}`
      : "to be confirmed";

  return [
    `New order ${order.number} — ${opts.storeName}`,
    "",
    ...items,
    "",
    `Subtotal: ${subtotal}`,
    `Payment: ${opts.paymentLabel}`,
    "",
    `Name: ${c.name}`,
    `Phone: ${c.phone}`,
    `Area: ${c.city}, ${c.governorate}`,
    `Address: ${c.address}`,
    c.notes ? `Notes: ${c.notes}` : "",
  ]
    .filter((line, i, all) => !(line === "" && all[i - 1] === ""))
    .join("\n")
    .trim();
}

export function buildEnquiryMessage(
  d: { name: string; phone: string; message: string },
  opts: { storeName: string; roleLabel: string; topicLabel?: string },
) {
  return [
    `Hello ${opts.storeName},`,
    "",
    d.message,
    "",
    `— ${d.name} (${opts.roleLabel})`,
    opts.topicLabel ? `Topic: ${opts.topicLabel}` : null,
    `Phone: ${d.phone}`,
  ]
    .filter((line) => line !== null)
    .join("\n");
}

/** English payment method names, for messages and alerts. */
export const paymentMethodLabels = {
  cod: "Cash on delivery",
  wallet: "Whish / OMT",
} as const satisfies Record<"cod" | "wallet", string>;
