/**
 * Admin authentication against the real database. A throwaway admin is created
 * and removed. Covers the security checks listed in docs/backend-plan.md.
 */
import 'dotenv/config';
import { Controller, Get, type INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import argon2 from 'argon2';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { hashToken } from '../src/auth/auth.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

const EMAIL = 'e2e-admin@example.com';
const PASSWORD = 'a-long-test-password';

/** Stands in for the real admin routes, to test the path-based guard on its own. */
@Controller('admin/e2e-probe')
class ProbeController {
  @Get()
  probe() {
    return { ok: true };
  }
}

async function createApp(env: Record<string, string> = {}) {
  Object.assign(process.env, { NOTIFICATIONS_WORKER: 'off', ...env });
  const moduleRef = await Test.createTestingModule({ imports: [AppModule], controllers: [ProbeController] }).compile();
  const app = configureApp(moduleRef.createNestApplication());
  await app.init();
  return app;
}

/** Cookie name → { value, attributes } from a response's Set-Cookie headers. */
function cookies(res: request.Response) {
  const raw = ([] as string[]).concat(res.headers['set-cookie'] ?? []);
  return Object.fromEntries(
    raw.map((c) => {
      const [pair, ...attrs] = c.split('; ');
      const [name, value] = pair!.split('=');
      return [name, { value: value!, attrs: attrs.join('; ') }];
    }),
  );
}

const header = (jar: Record<string, { value: string }>, ...names: string[]) =>
  names.map((n) => `${n}=${jar[n]!.value}`).join('; ');

describe('Admin auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminId: string;

  const login = (password = PASSWORD, email = EMAIL) =>
    request(app.getHttpServer()).post('/api/auth/login').send({ email, password });

  beforeAll(async () => {
    // This block signs in many times; the real limit is tested separately below.
    app = await createApp({ LOGIN_RATE_LIMIT: '1000' });
    prisma = app.get(PrismaService);
    await prisma.adminUser.deleteMany({ where: { email: EMAIL } });
    adminId = (
      await prisma.adminUser.create({
        data: { email: EMAIL, name: 'E2E Admin', passwordHash: await argon2.hash(PASSWORD) },
      })
    ).id;
  });

  afterAll(async () => {
    delete process.env.LOGIN_RATE_LIMIT;
    await prisma.adminUser.deleteMany({ where: { email: EMAIL } });
    await app.close();
  });

  beforeEach(async () => {
    await prisma.adminUser.update({ where: { id: adminId }, data: { isActive: true } });
  });

  it('refuses a wrong password and an unknown email with the same message', async () => {
    const wrong = await login('not-the-password').expect(401);
    const unknown = await login(PASSWORD, 'nobody@example.com').expect(401);
    expect(wrong.body.message).toBe('Email or password is incorrect.');
    expect(unknown.body.message).toBe(wrong.body.message);
    expect(cookies(wrong)).toEqual({});
  });

  it('signs in with httpOnly, SameSite cookies; the refresh cookie only goes to /api/auth', async () => {
    const res = await login().expect(200);
    expect(res.body.admin).toEqual({ id: adminId, email: EMAIL, name: 'E2E Admin' });
    const jar = cookies(res);
    expect(jar['rs_admin']!.attrs).toMatch(/Path=\/;.*HttpOnly.*SameSite=Lax/);
    expect(jar['rs_admin_refresh']!.attrs).toMatch(/Path=\/api\/auth;.*HttpOnly.*SameSite=Lax/);
    // Only a hash of the refresh token is stored.
    const stored = await prisma.refreshToken.findUnique({ where: { tokenHash: hashToken(jar['rs_admin_refresh']!.value) } });
    expect(stored?.adminUserId).toBe(adminId);
  });

  it('accepts emails in any case', async () => {
    await login(PASSWORD, ' E2E-Admin@Example.com ').expect(200);
  });

  it('refuses every /api/admin route and /auth/me without a valid session', async () => {
    const server = app.getHttpServer();
    await request(server).get('/api/admin/e2e-probe').expect(401);
    await request(server).get('/api/admin/e2e-probe').set('Cookie', 'rs_admin=forged.token.value').expect(401);
    await request(server).get('/api/auth/me').expect(401);

    const jar = cookies(await login());
    await request(server).get('/api/admin/e2e-probe').set('Cookie', header(jar, 'rs_admin')).expect(200, { ok: true });
    await request(server).get('/api/auth/me').set('Cookie', header(jar, 'rs_admin')).expect(200);
  });

  it('never rate-limits /auth/me, which the admin site calls on every page load', async () => {
    const server = app.getHttpServer();
    const jar = cookies(await login());
    // Well past the default limit for public submissions (5 per 10 minutes).
    for (let i = 0; i < 25; i++) {
      await request(server).get('/api/auth/me').set('Cookie', header(jar, 'rs_admin')).expect(200);
    }
  });

  it('refuses an expired access token', async () => {
    const jar = cookies(await login());
    const sid = (await prisma.refreshToken.findUniqueOrThrow({ where: { tokenHash: hashToken(jar['rs_admin_refresh']!.value) } })).familyId;
    const expired = await app.get(JwtService).signAsync({ sub: adminId, sid, exp: Math.floor(Date.now() / 1000) - 5 });
    await request(app.getHttpServer()).get('/api/auth/me').set('Cookie', `rs_admin=${expired}`).expect(401);
  });

  it('rotates the refresh token on every refresh', async () => {
    const first = cookies(await login());
    const res = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Cookie', header(first, 'rs_admin_refresh'))
      .expect(200);
    const second = cookies(res);
    expect(second['rs_admin_refresh']!.value).not.toBe(first['rs_admin_refresh']!.value);
    await request(app.getHttpServer()).get('/api/auth/me').set('Cookie', header(second, 'rs_admin')).expect(200);

    const old = await prisma.refreshToken.findUniqueOrThrow({ where: { tokenHash: hashToken(first['rs_admin_refresh']!.value) } });
    expect(old.revokedAt).not.toBeNull();
    expect(old.replacedById).not.toBeNull();
  });

  it('tolerates two tabs refreshing at once, but revokes every session when an old token is reused later', async () => {
    const server = app.getHttpServer();
    const first = cookies(await login());
    const second = cookies(await request(server).post('/api/auth/refresh').set('Cookie', header(first, 'rs_admin_refresh')));
    const otherDevice = cookies(await login());

    // Within the grace window: refused, but the session survives.
    await request(server).post('/api/auth/refresh').set('Cookie', header(first, 'rs_admin_refresh')).expect(401);
    await request(server).get('/api/auth/me').set('Cookie', header(second, 'rs_admin')).expect(200);

    // Later: treated as a stolen token. Every session of this admin ends.
    await prisma.refreshToken.updateMany({
      where: { tokenHash: hashToken(first['rs_admin_refresh']!.value) },
      data: { revokedAt: new Date(Date.now() - 60_000) },
    });
    await request(server).post('/api/auth/refresh').set('Cookie', header(first, 'rs_admin_refresh')).expect(401);
    await request(server).get('/api/auth/me').set('Cookie', header(second, 'rs_admin')).expect(401);
    await request(server).get('/api/auth/me').set('Cookie', header(otherDevice, 'rs_admin')).expect(401);
    await request(server).post('/api/auth/refresh').set('Cookie', header(second, 'rs_admin_refresh')).expect(401);
  });

  it('logout ends the session at once and clears the cookies', async () => {
    const server = app.getHttpServer();
    const jar = cookies(await login());
    const res = await request(server).post('/api/auth/logout').set('Cookie', header(jar, 'rs_admin_refresh')).expect(204);
    expect(cookies(res)['rs_admin']!.value).toBe('');
    await request(server).get('/api/auth/me').set('Cookie', header(jar, 'rs_admin')).expect(401);
    await request(server).post('/api/auth/refresh').set('Cookie', header(jar, 'rs_admin_refresh')).expect(401);
  });

  it('"sign out everywhere" ends every session', async () => {
    const server = app.getHttpServer();
    const phone = cookies(await login());
    const laptop = cookies(await login());
    await request(server).post('/api/auth/logout-all').set('Cookie', header(laptop, 'rs_admin')).expect(204);
    await request(server).get('/api/auth/me').set('Cookie', header(phone, 'rs_admin')).expect(401);
  });

  it('a disabled admin cannot sign in, and their open sessions stop working', async () => {
    const jar = cookies(await login());
    await prisma.adminUser.update({ where: { id: adminId }, data: { isActive: false } });
    await login().expect(401);
    await request(app.getHttpServer()).get('/api/auth/me').set('Cookie', header(jar, 'rs_admin')).expect(401);
  });
});

describe('Admin login rate limit (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('answers 429 after 10 attempts', async () => {
    for (let i = 0; i < 10; i++) {
      await request(app.getHttpServer()).post('/api/auth/login').send({ email: 'guess@example.com', password: 'x' }).expect(401);
    }
    await request(app.getHttpServer()).post('/api/auth/login').send({ email: 'guess@example.com', password: 'x' }).expect(429);
  });
});
