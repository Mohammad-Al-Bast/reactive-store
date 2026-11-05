/**
 * Catalogue editing against the real database. Creates a throwaway admin,
 * department and products, and uploads into a temporary folder; all removed after.
 */
import 'dotenv/config';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { ProductUpsert } from '@reactive-store/shared';
import argon2 from 'argon2';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { WebRevalidator } from '../src/catalog-admin/web-revalidator.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

const EMAIL = 'e2e-catalog-admin@example.com';
const PASSWORD = 'a-long-test-password';
const SLUG = 'e2e-test-product';
const CATEGORY_SLUG = 'e2e-test-department';

describe('Catalogue admin (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let cookie: string;
  let uploads: string;
  let categoryId: string;
  let productId: string;
  const catalogChanged = vi.fn().mockResolvedValue(true);

  const api = () => request(app.getHttpServer());
  const as = <T extends request.Test>(r: T) => r.set('Cookie', cookie);

  const draft = (): ProductUpsert => ({
    slug: SLUG,
    categoryId,
    price: 19.5,
    stock: 'in-stock',
    status: 'draft',
    bestSeller: false,
    audience: ['home'],
    translations: {
      en: {
        name: 'E2E Test Product',
        type: 'Accessories',
        summary: 'Holds [X] items.',
        specs: [{ label: 'Weight', value: '200 g' }],
        inTheBox: ['Product', 'Manual'],
      },
    },
    related: ['electrode-pads', 'portable-treatment-table'],
  });

  beforeAll(async () => {
    uploads = mkdtempSync(join(tmpdir(), 'rs-uploads-'));
    Object.assign(process.env, { UPLOAD_DIR: uploads, LOGIN_RATE_LIMIT: '1000' });
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(WebRevalidator)
      .useValue({ catalogChanged })
      .compile();
    app = configureApp(moduleRef.createNestApplication());
    await app.init();
    prisma = app.get(PrismaService);

    await prisma.product.deleteMany({ where: { slug: { startsWith: 'e2e-test-' } } });
    await prisma.category.deleteMany({ where: { slug: CATEGORY_SLUG } });
    await prisma.adminUser.deleteMany({ where: { email: EMAIL } });
    await prisma.adminUser.create({ data: { email: EMAIL, name: 'Catalog E2E', passwordHash: await argon2.hash(PASSWORD) } });
    const login = await api().post('/api/auth/login').send({ email: EMAIL, password: PASSWORD }).expect(200);
    cookie = ([] as string[]).concat(login.headers['set-cookie'] ?? []).find((c) => c.startsWith('rs_admin='))!.split(';')[0]!;
    categoryId = (await prisma.category.findUniqueOrThrow({ where: { slug: 'physiotherapy-rehabilitation' } })).id;
  });

  afterAll(async () => {
    delete process.env.UPLOAD_DIR;
    delete process.env.LOGIN_RATE_LIMIT;
    await prisma.product.deleteMany({ where: { slug: { startsWith: 'e2e-test-' } } });
    await prisma.category.deleteMany({ where: { slug: CATEGORY_SLUG } });
    await prisma.adminUser.deleteMany({ where: { email: EMAIL } });
    await app.close();
    rmSync(uploads, { recursive: true, force: true });
  });

  it('refuses catalogue editing without a session', async () => {
    await api().get('/api/admin/products').expect(401);
    await api().post('/api/admin/products').send(draft()).expect(401);
    await api().get('/api/admin/categories').expect(401);
  });

  it('lists every product, drafts included, with warnings', async () => {
    const res = await as(api().get('/api/admin/products')).expect(200);
    const table = res.body.find((p: { slug: string }) => p.slug === 'portable-treatment-table');
    expect(table).toMatchObject({ status: 'draft', price: 180, categoryName: 'Physiotherapy & Rehabilitation' });
    expect(table.warnings).toContain('Has [bracketed] placeholder text');
    const drafts = await as(api().get('/api/admin/products?status=draft')).expect(200);
    expect(drafts.body.every((p: { status: string }) => p.status === 'draft')).toBe(true);
  });

  it('creates a draft, then refuses to publish it while it has placeholder text', async () => {
    const created = await as(api().post('/api/admin/products')).send(draft()).expect(201);
    productId = created.body.id;
    expect(created.body).toMatchObject({ slug: SLUG, status: 'draft', price: 19.5, related: ['electrode-pads', 'portable-treatment-table'] });
    expect(created.body.translations.en.specs).toEqual([{ label: 'Weight', value: '200 g' }]);
    expect(catalogChanged).toHaveBeenCalled();

    const publish = await as(api().put(`/api/admin/products/${productId}`))
      .send({ ...draft(), status: 'published' })
      .expect(422);
    expect(publish.body.message).toContain('placeholder');
    await api().get(`/api/products/${SLUG}`).expect(404);
  });

  it('publishes once the text is complete, and the store shows the new details', async () => {
    const body = draft();
    body.translations.en.summary = 'Holds 12 items.';
    body.status = 'published';
    await as(api().put(`/api/admin/products/${productId}`)).send(body).expect(200);

    const pub = await api().get(`/api/products/${SLUG}`).expect(200);
    expect(pub.body).toMatchObject({ name: 'E2E Test Product', summary: 'Holds 12 items.', price: 19.5 });
    // The draft related product is hidden from the public, the published one shown.
    expect(pub.body.related).toEqual(['electrode-pads']);

    body.price = null;
    await as(api().put(`/api/admin/products/${productId}`)).send(body).expect(200);
    expect((await api().get(`/api/products/${SLUG}`)).body.price).toBeNull();
  });

  it('refuses a web address another product already uses', async () => {
    await as(api().put(`/api/admin/products/${productId}`)).send({ ...draft(), slug: 'electrode-pads' }).expect(409);
  });

  it('uploads a photo as WebP, and deleting it removes the file', async () => {
    const png = await sharp({ create: { width: 2400, height: 1200, channels: 3, background: '#3a7' } }).png().toBuffer();
    const res = await as(api().post(`/api/admin/products/${productId}/images`))
      .attach('file', png, { filename: 'photo.png', contentType: 'image/png' })
      .expect(201);
    const image = res.body.images[0];
    expect(image.url).toMatch(/^\/uploads\/products\/[0-9a-f-]{36}\.webp$/);
    expect(image.alt).toBe('E2E Test Product');
    const file = join(uploads, image.url.replace('/uploads/', ''));
    // Read into memory: sharp(path) can keep the file open on Windows.
    const meta = await sharp(readFileSync(file)).metadata();
    expect(meta).toMatchObject({ format: 'webp', width: 1600, height: 800 });
    expect((await api().get(`/api/products/${SLUG}`)).body.image).toBe(image.url);

    await as(api().delete(`/api/admin/products/${productId}/images/${image.id}`)).expect(200);
    expect(existsSync(file)).toBe(false);
  });

  it('rejects a file that only pretends to be an image', async () => {
    const res = await as(api().post(`/api/admin/products/${productId}/images`))
      .attach('file', Buffer.from('not really a png'), { filename: 'x.png', contentType: 'image/png' })
      .expect(400);
    expect(res.body.message).toContain("isn't a readable image");
    await as(api().post(`/api/admin/products/${productId}/images`))
      .attach('file', Buffer.from('%PDF-1.4'), { filename: 'x.pdf', contentType: 'application/pdf' })
      .expect(400);
  });

  it('manages departments, refusing to delete one that still has products', async () => {
    const translations = { en: { name: 'E2E Department', short: 'E2E', description: 'For tests.', items: 'Test things' } };
    const created = await as(api().post('/api/admin/categories')).send({ slug: CATEGORY_SLUG, sortOrder: 99, translations }).expect(201);
    const dept = created.body.find((c: { slug: string }) => c.slug === CATEGORY_SLUG);
    expect(dept).toMatchObject({ productCount: 0, translations: { en: { name: 'E2E Department' } } });

    await as(api().put(`/api/admin/products/${productId}`)).send({ ...draft(), categoryId: dept.id }).expect(200);
    await as(api().delete(`/api/admin/categories/${dept.id}`)).expect(409);
    await as(api().put(`/api/admin/products/${productId}`)).send(draft()).expect(200);
    const renamed = await as(api().put(`/api/admin/categories/${dept.id}`))
      .send({ slug: CATEGORY_SLUG, translations: { en: { ...translations.en, name: 'Renamed' } } })
      .expect(200);
    expect(renamed.body.find((c: { slug: string }) => c.slug === CATEGORY_SLUG)).toMatchObject({ translations: { en: { name: 'Renamed' } } });
    await as(api().delete(`/api/admin/categories/${dept.id}`)).expect(204);
  });

  it('deletes a product; the store no longer shows it', async () => {
    await as(api().delete(`/api/admin/products/${productId}`)).expect(204);
    await api().get(`/api/products/${SLUG}`).expect(404);
  });
});
