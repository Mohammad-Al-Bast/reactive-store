/**
 * Orders and enquiries against the real database (migrated and seeded).
 * Rows created here are deleted afterwards.
 */
import 'dotenv/config';
import { Test } from '@nestjs/testing';
import { orderNumberPattern } from '@reactive-store/shared';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { PermanentSendError } from '../src/notifications/channel.js';
import { EmailChannel } from '../src/notifications/email.channel.js';
import { NotificationsService } from '../src/notifications/notifications.service.js';
import { TelegramChannel } from '../src/notifications/telegram.channel.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

const customer = {
  name: 'E2E Test Customer',
  phone: '81 164 065',
  governorate: 'Bekaa',
  city: 'Shtoura',
  address: 'Test building',
};

/**
 * The app with a fake Telegram bot (two staff chats) and email switched off.
 * The background sender is off, so tests deliver alerts by calling processDue().
 */
async function createApp(env: Record<string, string> = {}) {
  Object.assign(process.env, { NOTIFICATIONS_WORKER: 'off', ...env });
  const telegramSend = vi.fn().mockResolvedValue(undefined);
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(TelegramChannel)
    .useValue({ enabled: true, targets: ['1001', '1002'], send: telegramSend })
    .overrideProvider(EmailChannel)
    .useValue({ enabled: false, targets: [], send: vi.fn() })
    .compile();
  const app = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();
  return { app, prisma: app.get(PrismaService), notifications: app.get(NotificationsService), telegramSend };
}

async function cleanUp(prisma: PrismaService) {
  await prisma.order.deleteMany({ where: { customerName: customer.name } });
  await prisma.enquiry.deleteMany({ where: { name: customer.name } });
}

describe('Orders (e2e)', () => {
  let ctx: Awaited<ReturnType<typeof createApp>>;

  beforeAll(async () => {
    ctx = await createApp({ WEB_ORIGIN: 'http://localhost:3000' });
  });

  afterAll(async () => {
    await cleanUp(ctx.prisma);
    await ctx.app.close();
  });

  it('saves an order with server prices, its first status and its staff alerts', async () => {
    const res = await request(ctx.app.getHttpServer())
      .post('/api/orders')
      .send({
        items: [
          // A tampered price is not part of the schema and is ignored.
          { slug: '4-in-1-tens-ems-unit', qty: 2, price: 0.01 },
          { slug: 'electrode-pads', qty: 1 },
          { slug: '4-in-1-tens-ems-unit', qty: 1 },
        ],
        customer,
        paymentMethod: 'cod',
        subtotal: 1,
      })
      .expect(201);

    expect(res.body.number).toMatch(orderNumberPattern);
    expect(res.body.items).toEqual([
      { slug: '4-in-1-tens-ems-unit', name: '4-in-1 TENS / EMS Therapy Unit', qty: 3, unitPrice: 70 },
      { slug: 'electrode-pads', name: 'Electrode Pads, Pack of 4', qty: 1, unitPrice: null },
    ]);
    expect(res.body.subtotal).toBe(210);
    expect(res.body.totalToConfirm).toBe(true);

    const saved = await ctx.prisma.order.findUniqueOrThrow({
      where: { number: res.body.number },
      include: { items: true, statusHistory: true, notifications: true },
    });
    expect(saved.subtotal.toNumber()).toBe(210);
    expect(saved.items).toHaveLength(2);
    expect(saved.items.find((i) => i.productSlug === '4-in-1-tens-ems-unit')?.unitPrice?.toNumber()).toBe(70);
    expect(saved.statusHistory.map((h) => h.status)).toEqual(['new']);

    // One alert per staff chat, saved with the order and waiting to be sent.
    expect(saved.notifications.map((n) => [n.channel, n.target, n.status]).sort()).toEqual([
      ['telegram', '1001', 'pending'],
      ['telegram', '1002', 'pending'],
    ]);
    expect(saved.notifications[0]!.text).toContain(`New order ${res.body.number}`);
    expect(saved.notifications[0]!.text).toContain('$210.00 + items on request');

    await ctx.notifications.processDue();
    expect(ctx.telegramSend).toHaveBeenCalledTimes(2);
    expect(ctx.telegramSend).toHaveBeenCalledWith('1001', expect.objectContaining({ text: expect.stringContaining(res.body.number) }));
    const after = await ctx.prisma.notification.findMany({ where: { orderId: saved.id } });
    expect(after.every((n) => n.status === 'sent' && n.sentAt)).toBe(true);
  });

  it('retries an alert that failed, and stops on a permanent error', async () => {
    const res = await request(ctx.app.getHttpServer())
      .post('/api/orders')
      .send({ items: [{ slug: 'loop-bands', qty: 1 }], customer, paymentMethod: 'cod' })
      .expect(201);
    const { id } = await ctx.prisma.order.findUniqueOrThrow({ where: { number: res.body.number } });

    ctx.telegramSend.mockReset();
    ctx.telegramSend.mockImplementation(async (target: string) => {
      throw target === '1001'
        ? new Error('Telegram unreachable')
        : new PermanentSendError('Telegram 403: bot was blocked by the user');
    });
    await ctx.notifications.processDue();

    const rows = await ctx.prisma.notification.findMany({ where: { orderId: id }, orderBy: { target: 'asc' } });
    const [retrying, failed] = rows;
    expect(retrying).toMatchObject({ status: 'pending', attempts: 1, lastError: 'Telegram unreachable' });
    expect(retrying!.nextAttemptAt.getTime()).toBeGreaterThan(Date.now() + 20_000);
    expect(failed).toMatchObject({ status: 'failed', attempts: 1 });
    expect(failed!.lastError).toContain('blocked');

    // Not due yet, so nothing is sent again.
    await ctx.notifications.processDue();
    expect(ctx.telegramSend).toHaveBeenCalledTimes(2);
  });

  it('refuses drafts and unknown products with 422 and lists them', async () => {
    const res = await request(ctx.app.getHttpServer())
      .post('/api/orders')
      .send({
        items: [
          { slug: 'electrode-pads', qty: 1 },
          { slug: 'portable-treatment-table', qty: 1 },
          { slug: 'does-not-exist', qty: 1 },
        ],
        customer,
        paymentMethod: 'wallet',
      })
      .expect(422);
    expect(res.body.missing).toEqual(['portable-treatment-table', 'does-not-exist']);
  });

  it('returns field errors for invalid details', async () => {
    const res = await request(ctx.app.getHttpServer())
      .post('/api/orders')
      .send({ items: [{ slug: 'electrode-pads', qty: 1 }], customer: { ...customer, phone: '12' }, paymentMethod: 'cod' })
      .expect(400);
    expect(res.body.issues).toEqual([expect.objectContaining({ path: 'customer.phone' })]);
  });

  it('answers a bot that fills the honeypot, but saves and alerts nothing', async () => {
    const before = await ctx.prisma.order.count();
    const alertsBefore = await ctx.prisma.notification.count();
    const res = await request(ctx.app.getHttpServer())
      .post('/api/orders')
      .send({ items: [{ slug: 'electrode-pads', qty: 1 }], customer, paymentMethod: 'cod', website: 'http://spam' })
      .expect(201);
    expect(res.body.number).toMatch(orderNumberPattern);
    expect(await ctx.prisma.order.count()).toBe(before);
    expect(await ctx.prisma.notification.count()).toBe(alertsBefore);
  });

  it('refuses a POST from another website', () => {
    return request(ctx.app.getHttpServer())
      .post('/api/orders')
      .set('Origin', 'https://evil.example')
      .send({ items: [{ slug: 'electrode-pads', qty: 1 }], customer, paymentMethod: 'cod' })
      .expect(403);
  });
});

describe('Enquiries (e2e)', () => {
  let ctx: Awaited<ReturnType<typeof createApp>>;

  beforeAll(async () => {
    ctx = await createApp();
  });

  afterAll(async () => {
    await cleanUp(ctx.prisma);
    await ctx.app.close();
  });

  it('saves an enquiry and queues its staff alerts', async () => {
    await request(ctx.app.getHttpServer())
      .post('/api/enquiries')
      .send({ name: customer.name, phone: customer.phone, role: 'student', topic: 'group-order', message: 'Ten tables' })
      .expect(201, { received: true });
    const saved = await ctx.prisma.enquiry.findFirstOrThrow({
      where: { name: customer.name },
      include: { notifications: true },
    });
    expect(saved).toMatchObject({ role: 'student', topic: 'group-order', message: 'Ten tables', handledAt: null });
    expect(saved.notifications).toHaveLength(2);
    expect(saved.notifications[0]!.text).toContain('New enquiry from E2E Test Customer');
  });

  it('rejects an empty message', () => {
    return request(ctx.app.getHttpServer())
      .post('/api/enquiries')
      .send({ name: customer.name, phone: customer.phone, role: 'student', message: ' ' })
      .expect(400);
  });
});

describe('Rate limits (e2e)', () => {
  let ctx: Awaited<ReturnType<typeof createApp>>;

  beforeAll(async () => {
    ctx = await createApp({ SUBMIT_RATE_LIMIT: '2' });
  });

  afterAll(async () => {
    delete process.env.SUBMIT_RATE_LIMIT;
    await cleanUp(ctx.prisma);
    await ctx.app.close();
  });

  it('allows the limit, then answers 429', async () => {
    const send = () =>
      request(ctx.app.getHttpServer())
        .post('/api/enquiries')
        .send({ name: customer.name, phone: customer.phone, role: 'clinic', message: 'Hello' });
    await send().expect(201);
    await send().expect(201);
    await send().expect(429);
  });
});
