import {
  buildOrderMessage,
  formatUsd,
  paymentMethodLabels,
  type CreateEnquiry,
  type OrderSummary,
} from '@reactive-store/shared';

const STORE_NAME = 'Reactive Store';

export type AlertMessage = { subject: string; text: string };

/** Link to an order in the admin panel, when ADMIN_URL is set (the panel arrives in Phase 3). */
export function orderLink(adminUrl: string | undefined, number: string) {
  return adminUrl ? `${adminUrl.replace(/\/$/, '')}/orders/${number}` : undefined;
}

function total(order: OrderSummary) {
  if (order.subtotal <= 0) return 'total to be confirmed';
  return `${formatUsd(order.subtotal)}${order.totalToConfirm ? ' + items on request' : ''}`;
}

/** Short alert for a phone screen: who, what, how much, and where to look. */
export function orderChatAlert(order: OrderSummary, adminUrl?: string): AlertMessage {
  const c = order.customer;
  const count = order.items.reduce((n, l) => n + l.qty, 0);
  const link = orderLink(adminUrl, order.number);
  const lines = [
    `🛒 New order ${order.number}`,
    `${count} item${count === 1 ? '' : 's'} · ${total(order)} · ${paymentMethodLabels[order.paymentMethod]}`,
    '',
    `${c.name} · ${c.phone}`,
    `${c.city}, ${c.governorate}`,
    c.address,
    '',
    ...order.items.map(
      (l) => `• ${l.qty} × ${l.name} — ${l.unitPrice == null ? 'price on request' : formatUsd(l.unitPrice * l.qty)}`,
    ),
    c.notes ? `\nNotes: ${c.notes}` : null,
    link ? `\nOpen in dashboard: ${link}` : null,
  ];
  return { subject: `New order ${order.number}`, text: lines.filter((l) => l !== null).join('\n') };
}

/** Full order for email, in the same format customers send on WhatsApp. */
export function orderEmailAlert(order: OrderSummary, adminUrl?: string): AlertMessage {
  const link = orderLink(adminUrl, order.number);
  const text = buildOrderMessage(order, {
    storeName: STORE_NAME,
    paymentLabel: paymentMethodLabels[order.paymentMethod],
  });
  return { subject: `New order ${order.number}`, text: link ? `${text}\n\nOpen in dashboard: ${link}` : text };
}

const readable = (id: string) => id.replace(/-/g, ' ');

export function enquiryAlert(enquiry: CreateEnquiry): AlertMessage {
  const text = [
    `💬 New enquiry from ${enquiry.name}`,
    `${readable(enquiry.role)}${enquiry.topic ? ` · ${readable(enquiry.topic)}` : ''}`,
    `Phone: ${enquiry.phone}`,
    '',
    enquiry.message,
  ].join('\n');
  return { subject: `New enquiry from ${enquiry.name}`, text };
}
