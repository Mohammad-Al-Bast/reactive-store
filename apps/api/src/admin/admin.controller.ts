import { Body, Controller, Get, HttpCode, NotFoundException, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import {
  adminEnquiryListQuerySchema,
  adminEnquiryUpdateSchema,
  adminOrderListQuerySchema,
  adminOrderUpdateSchema,
  orderNumberPattern,
  type AdminDashboard,
  type AdminEnquiry,
  type Page,
} from '@reactive-store/shared';
import { z } from 'zod';
import { CurrentAdmin } from '../auth/admin-auth.guard.js';
import type { AuthenticatedAdmin } from '../auth/auth.constants.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AdminOrdersService } from './admin-orders.service.js';
import { buildDailySeries } from './daily-series.js';
import { orderListInclude, toEnquiry, toOrderListItem } from './admin.mappers.js';

/** Midnight today in the store's time zone, whatever time zone the server runs in. */
export function startOfTodayIn(timeZone: string, now = new Date()) {
  const there = new Date(now.toLocaleString('en-US', { timeZone }));
  const offset = there.getTime() - now.getTime();
  there.setHours(0, 0, 0, 0);
  return new Date(there.getTime() - offset);
}

const orderNumberParam = new ZodValidationPipe(z.string().regex(orderNumberPattern, 'Invalid order number'));

/** Everything here is under /api/admin, so the global guard requires a signed-in admin. */
@Controller('admin')
export class AdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orders: AdminOrdersService,
    private readonly notifications: NotificationsService,
  ) {}

  @Get('dashboard')
  async dashboard(): Promise<AdminDashboard> {
    const startOfToday = startOfTodayIn('Asia/Beirut');
    const weekAgo = new Date(Date.now() - 7 * 86_400_000);
    const count = (where: Parameters<PrismaService['order']['count']>[0]) => this.prisma.order.count(where);

    const days = 90;
    const since = new Date(startOfToday.getTime() - (days + 1) * 86_400_000);
    const [fresh, confirmed, outForDelivery, today, last7Days, unhandled, failedAlerts, recent, open, history] =
      await Promise.all([
        count({ where: { status: 'new' } }),
        count({ where: { status: 'confirmed' } }),
        count({ where: { status: 'out_for_delivery' } }),
        count({ where: { createdAt: { gte: startOfToday } } }),
        count({ where: { createdAt: { gte: weekAgo } } }),
        this.prisma.enquiry.count({ where: { handledAt: null } }),
        this.prisma.notification.count({ where: { status: 'failed' } }),
        this.prisma.order.findMany({ include: orderListInclude, orderBy: { createdAt: 'desc' }, take: 8 }),
        this.prisma.enquiry.findMany({ where: { handledAt: null }, orderBy: { createdAt: 'desc' }, take: 5 }),
        this.prisma.order.findMany({
          where: { createdAt: { gte: since } },
          select: { createdAt: true, subtotal: true, status: true },
        }),
      ]);

    return {
      orders: { new: fresh, confirmed, outForDelivery, today, last7Days },
      daily: buildDailySeries(
        history.map((o) => ({ createdAt: o.createdAt, subtotal: o.subtotal.toNumber(), status: o.status })),
        { days, timeZone: 'Asia/Beirut' },
      ),
      enquiries: { unhandled },
      failedAlerts,
      recentOrders: recent.map(toOrderListItem),
      openEnquiries: open.map(toEnquiry),
    };
  }

  /* ---------- Orders ---------- */

  @Get('orders')
  listOrders(@Query(new ZodValidationPipe(adminOrderListQuerySchema)) query: z.output<typeof adminOrderListQuerySchema>) {
    return this.orders.list(query);
  }

  @Get('orders/:number')
  getOrder(@Param('number', orderNumberParam) number: string) {
    return this.orders.get(number);
  }

  @Patch('orders/:number')
  updateOrder(
    @Param('number', orderNumberParam) number: string,
    @Body(new ZodValidationPipe(adminOrderUpdateSchema)) body: z.output<typeof adminOrderUpdateSchema>,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.orders.update(number, body, admin.id);
  }

  /** Queues a staff alert to be sent again (e.g. after fixing the Telegram chat id). */
  @Post('alerts/:id/resend')
  @HttpCode(202)
  async resendAlert(@Param('id', new ParseUUIDPipe()) id: string) {
    const updated = await this.prisma.notification.updateMany({
      where: { id, status: { in: ['failed', 'sent', 'pending'] } },
      data: { status: 'pending', nextAttemptAt: new Date(), attempts: 0, lastError: null },
    });
    if (!updated.count) throw new NotFoundException('Alert not found, or it is being sent right now.');
    this.notifications.kick();
    return { queued: true };
  }

  /* ---------- Enquiries ---------- */

  @Get('enquiries')
  async listEnquiries(
    @Query(new ZodValidationPipe(adminEnquiryListQuerySchema)) query: z.output<typeof adminEnquiryListQuerySchema>,
  ): Promise<Page<AdminEnquiry>> {
    const where = query.handled === undefined ? {} : { handledAt: query.handled === 'true' ? { not: null } : null };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.enquiry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.enquiry.count({ where }),
    ]);
    return { items: rows.map(toEnquiry), total, page: query.page, pageSize: query.pageSize };
  }

  @Patch('enquiries/:id')
  async updateEnquiry(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(adminEnquiryUpdateSchema)) body: z.output<typeof adminEnquiryUpdateSchema>,
  ): Promise<AdminEnquiry> {
    const existing = await this.prisma.enquiry.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Enquiry not found');
    const updated = await this.prisma.enquiry.update({
      where: { id },
      data: { handledAt: body.handled ? (existing.handledAt ?? new Date()) : null },
    });
    return toEnquiry(updated);
  }
}
