import type {
  AdminEnquiry,
  AdminOrderDetail,
  AdminOrderListItem,
  OrderStatus,
} from '@reactive-store/shared';
import type { OrderStatus as DbOrderStatus, Prisma } from '../generated/prisma/client.js';

export const statusFromDb: Record<DbOrderStatus, OrderStatus> = {
  new: 'new',
  confirmed: 'confirmed',
  out_for_delivery: 'out-for-delivery',
  delivered: 'delivered',
  cancelled: 'cancelled',
};

export const statusToDb: Record<OrderStatus, DbOrderStatus> = {
  new: 'new',
  confirmed: 'confirmed',
  'out-for-delivery': 'out_for_delivery',
  delivered: 'delivered',
  cancelled: 'cancelled',
};

export const statusLabel: Record<OrderStatus, string> = {
  new: 'New',
  confirmed: 'Confirmed',
  'out-for-delivery': 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

export const orderListInclude = {
  items: { select: { quantity: true } },
} satisfies Prisma.OrderInclude;

export const orderDetailInclude = {
  items: { orderBy: { id: 'asc' } },
  statusHistory: { orderBy: { createdAt: 'asc' }, include: { changedBy: { select: { name: true } } } },
  notifications: { orderBy: [{ createdAt: 'asc' }, { target: 'asc' }] },
} satisfies Prisma.OrderInclude;

type OrderListRow = Prisma.OrderGetPayload<{ include: typeof orderListInclude }>;
type OrderDetailRow = Prisma.OrderGetPayload<{ include: typeof orderDetailInclude }>;

function listFields(o: Omit<OrderListRow, 'items'>, itemCount: number): AdminOrderListItem {
  return {
    number: o.number,
    status: statusFromDb[o.status],
    paymentStatus: o.paymentStatus,
    paymentMethod: o.paymentMethod,
    customerName: o.customerName,
    phone: o.phone,
    city: o.city,
    governorate: o.governorate,
    itemCount,
    subtotal: o.subtotal.toNumber(),
    totalToConfirm: o.totalToConfirm,
    createdAt: o.createdAt.toISOString(),
  };
}

export function toOrderListItem(o: OrderListRow): AdminOrderListItem {
  return listFields(o, o.items.reduce((n, i) => n + i.quantity, 0));
}

export function toOrderDetail(o: OrderDetailRow): AdminOrderDetail {
  return {
    ...listFields(o, o.items.reduce((n, i) => n + i.quantity, 0)),
    locale: o.locale,
    address: o.address,
    notes: o.notes,
    updatedAt: o.updatedAt.toISOString(),
    items: o.items.map((i) => ({
      slug: i.productSlug,
      name: i.productName,
      qty: i.quantity,
      unitPrice: i.unitPrice === null ? null : i.unitPrice.toNumber(),
      productExists: i.productId !== null,
    })),
    history: o.statusHistory.map((h) => ({
      status: statusFromDb[h.status],
      note: h.note,
      by: h.changedBy?.name ?? null,
      at: h.createdAt.toISOString(),
    })),
    alerts: o.notifications.map((n) => ({
      id: n.id,
      channel: n.channel,
      target: n.target,
      status: n.status,
      attempts: n.attempts,
      lastError: n.lastError,
      sentAt: n.sentAt?.toISOString() ?? null,
    })),
  };
}

export function toEnquiry(e: Prisma.EnquiryGetPayload<object>): AdminEnquiry {
  return {
    id: e.id,
    name: e.name,
    phone: e.phone,
    role: e.role,
    topic: e.topic,
    message: e.message,
    locale: e.locale,
    handledAt: e.handledAt?.toISOString() ?? null,
    createdAt: e.createdAt.toISOString(),
  };
}
