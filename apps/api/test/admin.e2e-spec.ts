/**
 * Admin API for orders, enquiries, alerts and the dashboard, against the real
 * database. A throwaway admin, orders and enquiries are created and removed.
 */
import 'dotenv/config';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import argon2 from 'argon2';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { EmailChannel } from '../src/notifications/email.channel.js';
import { NotificationsService } from '../src/notifications/notifications.service.js';
import { TelegramChannel } from '../src/notifications/telegram.channel.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

const EMAIL = 'e2e-admin-api@example.com';
const PASSWORD = 'a-long-test-password';
const CUSTOMER = 'E2E Admin API Customer';

describe('Admin API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let cookie: string;
  let orderNumber: string;
  const telegramSend = vi.fn().mockResolvedValue(undefined);

  const api = () => request(app.getHttpServer());
  const authed = {
    get: (url: string) => api().get(url).set('Cookie', cookie),
    patch: (url: string) => api().patch(url).set('Cookie', cookie),
    post: (url: string) => api().post(url).set('Cookie', cookie),
  };

  beforeAll(async () => {
    Object.assign(process.env, { NOTIFICATIONS_WORKER: 'off', LOGIN_RATE_LIMIT: '1000' });
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(TelegramChannel)
      .useValue({ enabled: true, targets: ['1001'], send: telegramSend })
      .overrideProvider(EmailChannel)
      .useValue({ enabled: false, targets: [], send: vi.fn() })
      .compile();
    app = configureApp(moduleRef.createNestApplication());
    await app.init();
    prisma = app.get(PrismaService);

    await prisma.adminUser.deleteMany({ where: { email: EMAIL } });
    await prisma.adminUser.create({
      data: { email: EMAIL, name: 'Rana (E2E)', passwordHash: await argon2.hash(PASSWORD) },
    });
    const login = await api().post('/api/auth/login').send({ email: EMAIL, password: PASSWORD }).expect(200);
    cookie = ([] as string[]).concat(login.headers['set-cookie'] ?? []).find((c) => c.startsWith('rs_admin='))!.split(';')[0]!;

    const order = await api()
      .post('/api/orders')
      .send({
        items: [{ slug: '4-in-1-tens-ems-unit', qty: 1 }, { slug: 'loop-bands', qty: 2 }],
        customer: { name: CUSTOMER, phone: '03 555 777', governorate: 'Beirut', city: 'Hamra', address: 'Bldg 9' },
        paymentMethod: 'wallet',
      })
      .expect(201);
    orderNumber = order.body.number;
    await api()
      .post('/api/enquiries')
      .send({ name: CUSTOMER, phone: '03 555 777', role: 'clinic', message: 'Quote for 3 tables' })
      .expect(201);
  });

  afterAll(async () => {
    delete process.env.LOGIN_RATE_LIMIT;
    await prisma.order.deleteMany({ where: { customerName: CUSTOMER } });
    await prisma.enquiry.deleteMany({ where: { name: CUSTOMER } });
    await prisma.adminUser.deleteMany({ where: { email: EMAIL } });
    await app.close();
  });

  it('refuses every admin route without a session', async () => {
    await api().get('/api/admin/dashboard').expect(401);
    await api().get('/api/admin/orders').expect(401);
    await api().get(`/api/admin/orders/${orderNumber}`).expect(401);
    await api().patch(`/api/admin/orders/${orderNumber}`).send({ status: 'confirmed' }).expect(401);
    await api().get('/api/admin/enquiries').expect(401);
    await api().post('/api/admin/alerts/00000000-0000-0000-0000-000000000000/resend').expect(401);
  });

  it('lists and searches orders, newest first', async () => {
    const byNumber = await authed.get(`/api/admin/orders?q=${orderNumber.toLowerCase()}`).expect(200);
    expect(byNumber.body.total).toBe(1);
    expect(byNumber.body.items[0]).toMatchObject({
      number: orderNumber,
      status: 'new',
      paymentStatus: 'unpaid',
      customerName: CUSTOMER,
      itemCount: 3,
      subtotal: 70,
      totalToConfirm: true,
    });
    const byPhone = await authed.get('/api/admin/orders?q=555 777').expect(200);
    expect(byPhone.body.items.map((o: { number: string }) => o.number)).toContain(orderNumber);
    const delivered = await authed.get('/api/admin/orders?status=delivered&q=' + orderNumber).expect(200);
    expect(delivered.body.total).toBe(0);
    await authed.get('/api/admin/orders?status=shipped').expect(400);
  });

  it('shows an order with its lines, history and alerts', async () => {
    const res = await authed.get(`/api/admin/orders/${orderNumber}`).expect(200);
    expect(res.body.items).toEqual([
      { slug: '4-in-1-tens-ems-unit', name: '4-in-1 TENS / EMS Therapy Unit', qty: 1, unitPrice: 70, productExists: true },
      { slug: 'loop-bands', name: 'Loop Bands, 5 Levels', qty: 2, unitPrice: null, productExists: true },
    ]);
    expect(res.body.history).toEqual([
      expect.objectContaining({ status: 'new', note: 'Order placed on the website', by: null }),
    ]);
    expect(res.body.alerts).toEqual([expect.objectContaining({ channel: 'telegram', target: '1001', status: 'pending' })]);

    await authed.get('/api/admin/orders/not-an-order').expect(400);
    await authed.get('/api/admin/orders/RS-990101-ZZZZZZ').expect(404);
  });

  it('moves an order through the flow, recording who did what', async () => {
    const skip = await authed.patch(`/api/admin/orders/${orderNumber}`).send({ status: 'delivered' }).expect(422);
    expect(skip.body.message).toContain("can't be marked delivered");

    await authed.patch(`/api/admin/orders/${orderNumber}`).send({ status: 'confirmed', note: 'Called, delivery Friday' }).expect(200);
    const res = await authed
      .patch(`/api/admin/orders/${orderNumber}`)
      .send({ paymentStatus: 'paid', note: 'Whish transfer received' })
      .expect(200);

    expect(res.body).toMatchObject({ status: 'confirmed', paymentStatus: 'paid' });
    expect(res.body.history.slice(1)).toEqual([
      expect.objectContaining({ status: 'confirmed', note: 'Called, delivery Friday', by: 'Rana (E2E)' }),
      expect.objectContaining({ status: 'confirmed', note: 'Payment marked paid. Whish transfer received', by: 'Rana (E2E)' }),
    ]);

    await authed.patch(`/api/admin/orders/${orderNumber}`).send({}).expect(400);
  });

  it('resends a failed alert', async () => {
    const { alerts } = (await authed.get(`/api/admin/orders/${orderNumber}`)).body;
    await prisma.notification.update({
      where: { id: alerts[0].id },
      data: { status: 'failed', attempts: 8, lastError: 'Telegram 400: chat not found' },
    });
    await authed.post(`/api/admin/alerts/${alerts[0].id}/resend`).expect(202);
    await app.get(NotificationsService).processDue();
    const after = (await authed.get(`/api/admin/orders/${orderNumber}`)).body.alerts[0];
    expect(after).toMatchObject({ status: 'sent', attempts: 1, lastError: null });
    expect(telegramSend).toHaveBeenCalledWith('1001', expect.objectContaining({ text: expect.stringContaining(orderNumber) }));
  });

  it('lists enquiries and marks them handled', async () => {
    const open = await authed.get('/api/admin/enquiries?handled=false').expect(200);
    const mine = open.body.items.find((e: { name: string }) => e.name === CUSTOMER);
    expect(mine).toMatchObject({ role: 'clinic', message: 'Quote for 3 tables', handledAt: null });

    const handled = await authed.patch(`/api/admin/enquiries/${mine.id}`).send({ handled: true }).expect(200);
    expect(handled.body.handledAt).not.toBeNull();
    const stillOpen = await authed.get('/api/admin/enquiries?handled=false').expect(200);
    expect(stillOpen.body.items.some((e: { id: string }) => e.id === mine.id)).toBe(false);

    const reopened = await authed.patch(`/api/admin/enquiries/${mine.id}`).send({ handled: false }).expect(200);
    expect(reopened.body.handledAt).toBeNull();
  });

  it('summarises the shop on the dashboard', async () => {
    const res = await authed.get('/api/admin/dashboard').expect(200);
    expect(res.body.orders.confirmed).toBeGreaterThanOrEqual(1);
    expect(res.body.orders.today).toBeGreaterThanOrEqual(1);
    expect(res.body.enquiries.unhandled).toBeGreaterThanOrEqual(1);
    expect(res.body.recentOrders.map((o: { number: string }) => o.number)).toContain(orderNumber);
  });
});
