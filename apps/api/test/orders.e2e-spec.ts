/**
 * Orders and enquiries against the real database (migrated and seeded).
 * Rows created here are deleted afterwards.
 */
import 'dotenv/config';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { orderNumberPattern } from '@reactive-store/shared';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { MailService } from '../src/mail/mail.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

const customer = {
  name: 'E2E Test Customer',
  phone: '81 164 065',
  governorate: 'Bekaa',
  city: 'Shtoura',
  address: 'Test building',
};

async function createApp(env: Record<string, string> = {}) {
  Object.assign(process.env, env);
  const notifyOrder = vi.fn().mockResolvedValue(true);
  const notifyEnquiry = vi.fn().mockResolvedValue(true);
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(MailService)
    .useValue({ notifyOrder, notifyEnquiry })
    .compile();
  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api');
  await app.init();
  return { app, prisma: app.get(PrismaService), notifyOrder, notifyEnquiry };
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

  it('saves an order with server prices and its first status, then alerts the store', async () => {
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
      include: { items: true, statusHistory: true },
    });
    expect(saved.subtotal.toNumber()).toBe(210);
    expect(saved.items).toHaveLength(2);
    expect(saved.items.find((i) => i.productSlug === '4-in-1-tens-ems-unit')?.unitPrice?.toNumber()).toBe(70);
    expect(saved.statusHistory.map((h) => h.status)).toEqual(['new']);
    expect(ctx.notifyOrder).toHaveBeenCalledWith(expect.objectContaining({ number: res.body.number }));
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

  it('answers a bot that fills the honeypot, but saves nothing', async () => {
    const before = await ctx.prisma.order.count();
    const res = await request(ctx.app.getHttpServer())
      .post('/api/orders')
      .send({ items: [{ slug: 'electrode-pads', qty: 1 }], customer, paymentMethod: 'cod', website: 'http://spam' })
      .expect(201);
    expect(res.body.number).toMatch(orderNumberPattern);
    expect(await ctx.prisma.order.count()).toBe(before);
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

  it('saves an enquiry and alerts the store', async () => {
    await request(ctx.app.getHttpServer())
      .post('/api/enquiries')
      .send({ name: customer.name, phone: customer.phone, role: 'student', topic: 'group-order', message: 'Ten tables' })
      .expect(201, { received: true });
    const saved = await ctx.prisma.enquiry.findFirstOrThrow({ where: { name: customer.name } });
    expect(saved).toMatchObject({ role: 'student', topic: 'group-order', message: 'Ten tables', handledAt: null });
    expect(ctx.notifyEnquiry).toHaveBeenCalledTimes(1);
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
