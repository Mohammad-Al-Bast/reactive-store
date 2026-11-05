/**
 * Runs against the real database in DATABASE_URL, which must be migrated and
 * seeded (`npm run db:migrate && npm run db:seed`). CI does this with a
 * postgres service container.
 */
import 'dotenv/config';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';

describe('Catalogue (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/categories lists every category', async () => {
    const res = await request(app.getHttpServer()).get('/api/categories').expect(200);
    expect(res.body.map((c: { slug: string }) => c.slug)).toContain('physiotherapy-rehabilitation');
  });

  it('GET /api/products returns only published products', async () => {
    const res = await request(app.getHttpServer()).get('/api/products').expect(200);
    const slugs = res.body.map((p: { slug: string }) => p.slug);
    expect(slugs).toContain('4-in-1-tens-ems-unit');
    expect(slugs).not.toContain('portable-treatment-table');
  });

  it('GET /api/products/:slug returns a product with published related items only', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/products/4-in-1-tens-ems-unit?locale=en')
      .expect(200);
    expect(res.body).toMatchObject({ price: 70, stock: 'in-stock', category: 'physiotherapy-rehabilitation' });
    expect(res.body.related).toEqual(['electrode-pads', 'lead-wires']);
  });

  it('GET /api/products/:slug hides drafts', () => {
    return request(app.getHttpServer()).get('/api/products/portable-treatment-table').expect(404);
  });

  it('rejects an unknown locale', () => {
    return request(app.getHttpServer()).get('/api/products?locale=fr').expect(400);
  });

  it('POST /api/cart/resolve merges repeats and reports missing slugs', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/cart/resolve')
      .send({
        items: [
          { slug: 'electrode-pads', qty: 2 },
          { slug: 'electrode-pads', qty: 1 },
          { slug: 'portable-treatment-table', qty: 1 },
        ],
      })
      .expect(200);
    expect(res.body.lines).toHaveLength(1);
    expect(res.body.lines[0]).toMatchObject({ qty: 3, product: { slug: 'electrode-pads' } });
    expect(res.body.missing).toEqual(['portable-treatment-table']);
  });

  it('POST /api/cart/resolve validates the body', () => {
    return request(app.getHttpServer())
      .post('/api/cart/resolve')
      .send({ items: [{ slug: 'electrode-pads', qty: 0 }] })
      .expect(400);
  });
});
