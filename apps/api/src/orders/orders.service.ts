import { Injectable, Logger, UnprocessableEntityException } from '@nestjs/common';
import {
  HONEYPOT_FIELD,
  type CreateOrder,
  type OrderSummary,
  type OrderUnavailableError,
} from '@reactive-store/shared';
import { pickTranslation } from '../catalog/catalog.mapper.js';
import { Prisma } from '../generated/prisma/client.js';
import { MailService } from '../mail/mail.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { makeOrderNumber } from './order-number.js';
import { mergeItems, priceOrder, type PricedProduct } from './pricing.js';

const MAX_NUMBER_ATTEMPTS = 5;

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
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

    const order = await this.insertWithUniqueNumber(input, priced);
    const result = summary(order.number, order.createdAt);
    // After the commit, and not awaited: a failed email must not fail the order.
    void this.mail.notifyOrder(result);
    return result;
  }

  /** Saves the order, its lines and its first status-history row in one transaction. */
  private async insertWithUniqueNumber(input: CreateOrder, priced: ReturnType<typeof priceOrder>) {
    for (let attempt = 1; ; attempt++) {
      try {
        return await this.prisma.$transaction(async (tx) =>
          tx.order.create({
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
            select: { number: true, createdAt: true },
          }),
        );
      } catch (err) {
        const duplicateNumber =
          err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
        if (!duplicateNumber || attempt >= MAX_NUMBER_ATTEMPTS) throw err;
      }
    }
  }
}
