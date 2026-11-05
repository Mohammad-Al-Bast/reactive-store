import { z } from "zod";
import {
  orderStatusSchema,
  paymentStatusSchema,
  type OrderStatus,
  type PaymentMethod,
  type PaymentStatus,
} from "./enums.js";

/** Body for `POST /api/auth/login`. */
export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Enter your email address.")),
  password: z.string().min(1, "Enter your password.").max(200),
});
export type LoginInput = z.input<typeof loginSchema>;

/** The signed-in admin, as returned by login, refresh and `GET /api/auth/me`. */
export type AdminProfile = { id: string; email: string; name: string };

/** Minimum length for admin passwords (set with the admin CLI). */
export const ADMIN_PASSWORD_MIN = 12;

/* ---------- Admin API: orders, enquiries, dashboard ---------- */

/**
 * Allowed status changes: forward through the delivery flow, cancel at any point
 * before delivery, and one step back to correct a mistake.
 */
export const orderStatusTransitions: Record<OrderStatus, OrderStatus[]> = {
  new: ["confirmed", "cancelled"],
  confirmed: ["out-for-delivery", "cancelled", "new"],
  "out-for-delivery": ["delivered", "cancelled", "confirmed"],
  delivered: ["out-for-delivery"],
  cancelled: ["new"],
};

const pageSchema = z.coerce.number().int().min(1).max(10_000).default(1);
const pageSizeSchema = z.coerce.number().int().min(1).max(100).default(25);

export type Page<T> = { items: T[]; total: number; page: number; pageSize: number };

export const adminOrderListQuerySchema = z.object({
  status: orderStatusSchema.optional(),
  /** Matches the order number, customer name or phone. */
  q: z.string().trim().max(100).optional(),
  page: pageSchema,
  pageSize: pageSizeSchema,
});
export type AdminOrderListQuery = z.input<typeof adminOrderListQuerySchema>;

export type AdminOrderListItem = {
  number: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  customerName: string;
  phone: string;
  city: string;
  governorate: string;
  itemCount: number;
  subtotal: number;
  totalToConfirm: boolean;
  createdAt: string;
};

export type AdminOrderDetail = AdminOrderListItem & {
  locale: string;
  address: string;
  notes: string | null;
  updatedAt: string;
  items: { slug: string; name: string; qty: number; unitPrice: number | null; productExists: boolean }[];
  history: { status: OrderStatus; note: string | null; by: string | null; at: string }[];
  alerts: {
    id: string;
    channel: string;
    target: string;
    status: "pending" | "sending" | "sent" | "failed";
    attempts: number;
    lastError: string | null;
    sentAt: string | null;
  }[];
};

/** Body for `PATCH /api/admin/orders/:number`. Each change adds one history entry. */
export const adminOrderUpdateSchema = z
  .object({
    status: orderStatusSchema.optional(),
    paymentStatus: paymentStatusSchema.optional(),
    /** Internal note, never shown to the customer. */
    note: z.string().trim().max(2000).optional(),
  })
  .refine((v) => v.status || v.paymentStatus || v.note, "Nothing to change.");
export type AdminOrderUpdate = z.input<typeof adminOrderUpdateSchema>;

export const adminEnquiryListQuerySchema = z.object({
  handled: z.enum(["true", "false"]).optional(),
  page: pageSchema,
  pageSize: pageSizeSchema,
});
export type AdminEnquiryListQuery = z.input<typeof adminEnquiryListQuerySchema>;

export type AdminEnquiry = {
  id: string;
  name: string;
  phone: string;
  role: string;
  topic: string | null;
  message: string;
  locale: string;
  handledAt: string | null;
  createdAt: string;
};

export const adminEnquiryUpdateSchema = z.object({ handled: z.boolean() });

export type AdminDashboard = {
  orders: { new: number; confirmed: number; outForDelivery: number; today: number; last7Days: number };
  enquiries: { unhandled: number };
  /** Staff alerts that gave up; worth a look. */
  failedAlerts: number;
  recentOrders: AdminOrderListItem[];
  openEnquiries: AdminEnquiry[];
};

