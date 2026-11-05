import { ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import {
  orderStatusTransitions,
  type AdminOrderDetail,
  type AdminOrderListItem,
  type Page,
  type PaymentStatus,
} from '@reactive-store/shared';
import type { adminOrderListQuerySchema, adminOrderUpdateSchema } from '@reactive-store/shared';
import type { z } from 'zod';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  orderDetailInclude,
  orderListInclude,
  statusFromDb,
  statusLabel,
  statusToDb,
  toOrderDetail,
  toOrderListItem,
} from './admin.mappers.js';

const paymentLabel: Record<PaymentStatus, string> = { unpaid: 'unpaid', paid: 'paid', refunded: 'refunded' };

@Injectable()
export class AdminOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: z.output<typeof adminOrderListQuerySchema>): Promise<Page<AdminOrderListItem>> {
    const where: Prisma.OrderWhereInput = {
      ...(query.status ? { status: statusToDb[query.status] } : {}),
      ...(query.q
        ? {
            OR: [
              { number: { contains: query.q, mode: 'insensitive' } },
              { customerName: { contains: query.q, mode: 'insensitive' } },
              { phone: { contains: query.q } },
            ],
          }
        : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        include: orderListInclude,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.order.count({ where }),
    ]);
    return { items: rows.map(toOrderListItem), total, page: query.page, pageSize: query.pageSize };
  }

  async get(number: string): Promise<AdminOrderDetail> {
    const order = await this.prisma.order.findUnique({ where: { number }, include: orderDetailInclude });
    if (!order) throw new NotFoundException(`Order ${number} not found`);
    return toOrderDetail(order);
  }

  /**
   * Changes status and/or payment status, or adds an internal note. Every call adds
   * one history entry recording who did it. Fails with 409 if someone else changed
   * the order's status in the meantime.
   */
  async update(
    number: string,
    change: z.output<typeof adminOrderUpdateSchema>,
    adminId: string,
  ): Promise<AdminOrderDetail> {
    await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { number } });
      if (!order) throw new NotFoundException(`Order ${number} not found`);
      const current = statusFromDb[order.status];

      const statusChanged = change.status !== undefined && change.status !== current;
      if (statusChanged && !orderStatusTransitions[current].includes(change.status!)) {
        throw new UnprocessableEntityException(
          `An order that is ${statusLabel[current].toLowerCase()} can't be marked ${statusLabel[change.status!].toLowerCase()}.`,
        );
      }
      const paymentChanged = change.paymentStatus !== undefined && change.paymentStatus !== order.paymentStatus;
      if (!statusChanged && !paymentChanged && !change.note) return;

      // Only update if the status is still what we read, so concurrent edits can't clobber each other.
      const updated = await tx.order.updateMany({
        where: { id: order.id, status: order.status },
        data: {
          ...(statusChanged ? { status: statusToDb[change.status!] } : {}),
          ...(paymentChanged ? { paymentStatus: change.paymentStatus } : {}),
          updatedAt: new Date(),
        },
      });
      if (!updated.count) throw new ConflictException('This order was just changed by someone else. Reload and try again.');

      const notes = [
        paymentChanged ? `Payment marked ${paymentLabel[change.paymentStatus!]}.` : null,
        change.note || null,
      ].filter(Boolean);
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: statusChanged ? statusToDb[change.status!] : order.status,
          note: notes.length ? notes.join(' ') : null,
          changedById: adminId,
        },
      });
    });
    return this.get(number);
  }
}
