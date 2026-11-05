import { Injectable, Logger, UnprocessableEntityException } from '@nestjs/common';
import {
  HONEYPOT_FIELD,
  type CreateOrder,
  type OrderSummary,
  type OrderUnavailableError,
} from '@reactive-store/shared';
import { pickTranslation } from '../catalog/catalog.mapper.js';
import { Prisma } from '../generated/prisma/client.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { makeOrderNumber } from './order-number.js';
import { mergeItems, priceOrder, type PricedProduct } from './pricing.js';

const MAX_NUMBER_ATTEMPTS = 5;

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(input: CreateOrder): Promise<OrderSummary> {
    const items = mergeItems(input.items);
    const rows = await this.prisma.product.findMany({
      where: { slug: { in: items.map((i) => i.slug) }, status: 'published' },
      select: { id: true, slug: true, price: true, translations: true },
    });
    const products = new Map<string, PricedProduct>(
      rows.map((r) => [
        r.slug,
        {
          id: r.id,
          slug: r.slug,
          price: r.price,
          name: pickTranslation(r.translations, input.locale)?.name ?? r.slug,
        },
      ]),
    );

    const priced = priceOrder(items, products);
    if (priced.missing.length) {
      const body: OrderUnavailableError = {
        message: 'Some items in your cart are no longer available.',
        missing: priced.missing,
      };
      throw new UnprocessableEntityException(body);
    }

    const summary = (number: string, createdAt: Date): OrderSummary => ({
      number,
      createdAt: createdAt.toISOString(),
      items: priced.lines.map(({ slug, name, qty, unitPrice }) => ({ slug, name, qty, unitPrice })),
      subtotal: priced.subtotal.toNumber(),
      totalToConfirm: priced.totalToConfirm,
      paymentMethod: input.paymentMethod,
      customer: input.customer,
    });

    // A filled honeypot means a bot: answer as if it worked, but save and send nothing.
    if (input[HONEYPOT_FIELD]) {
      this.logger.warn('Dropped an order with the honeypot field filled.');
      return summary(makeOrderNumber(), new Date());
    }

    const result = await this.insertWithUniqueNumber(input, priced, summary);
    // Alerts were queued in the transaction; send them now rather than at the next poll.
    this.notifications.kick();
    return result;
  }

  /**
   * Saves the order, its lines, its first status-history row and its staff alerts
   * in one transaction.
   */
  private async insertWithUniqueNumber(
    input: CreateOrder,
    priced: ReturnType<typeof priceOrder>,
    summary: (number: string, createdAt: Date) => OrderSummary,
  ) {
    for (let attempt = 1; ; attempt++) {
      try {
        return await this.prisma.$transaction(async (tx) => {
          const order = await tx.order.create({
            data: {
              number: makeOrderNumber(),
              paymentMethod: input.paymentMethod,
              locale: input.locale,
              customerName: input.customer.name,
              phone: input.customer.phone,
              governorate: input.customer.governorate,
              city: input.customer.city,
              address: input.customer.address,
              notes: input.customer.notes || null,
              subtotal: priced.subtotal,
              totalToConfirm: priced.totalToConfirm,
              items: {
                create: priced.lines.map((l) => ({
                  productId: l.productId,
                  productSlug: l.slug,
                  productName: l.name,
                  unitPrice: l.unitPriceDecimal,
                  quantity: l.qty,
                })),
              },
              statusHistory: { create: { status: 'new', note: 'Order placed on the website' } },
            },
            select: { id: true, number: true, createdAt: true },
          });
          const result = summary(order.number, order.createdAt);
          await this.notifications.queueOrder(tx, order.id, result);
          return result;
        });
      } catch (err) {
        const duplicateNumber =
          err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
        if (!duplicateNumber || attempt >= MAX_NUMBER_ATTEMPTS) throw err;
      }
    }
  }
}
