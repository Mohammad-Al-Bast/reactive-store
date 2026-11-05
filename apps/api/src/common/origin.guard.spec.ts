import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { OriginGuard } from './origin.guard.js';

const STORE = 'https://yourstore.com';
const ADMIN = 'https://admin.yourstore.com';

function guard(env: Record<string, string>) {
  return new OriginGuard({ get: (k: string) => env[k] } as unknown as ConfigService);
}

function ctx(method: string, path: string, origin?: string) {
  const req = { method, path, headers: origin ? { origin } : {} };
  return { switchToHttp: () => ({ getRequest: () => req }) } as unknown as ExecutionContext;
}

const allows = (g: OriginGuard, method: string, path: string, origin?: string) => {
  try {
    return g.canActivate(ctx(method, path, origin));
  } catch (err) {
    if (err instanceof ForbiddenException) return false;
    throw err;
  }
};

describe('OriginGuard', () => {
  const g = guard({ WEB_ORIGIN: STORE, ADMIN_ORIGIN: ADMIN });

  it('lets the store post orders and enquiries, but not the admin API', () => {
    expect(allows(g, 'POST', '/api/orders', STORE)).toBe(true);
    expect(allows(g, 'POST', '/api/enquiries', STORE)).toBe(true);
    expect(allows(g, 'POST', '/api/auth/login', STORE)).toBe(false);
    expect(allows(g, 'PATCH', '/api/admin/orders/RS-1', STORE)).toBe(false);
  });

  it('lets the admin site use auth and admin routes only', () => {
    expect(allows(g, 'POST', '/api/auth/refresh', ADMIN)).toBe(true);
    expect(allows(g, 'DELETE', '/api/admin/products/x', ADMIN)).toBe(true);
    expect(allows(g, 'POST', '/api/orders', ADMIN)).toBe(false);
  });

  it('refuses other websites, allows reads and requests without Origin', () => {
    expect(allows(g, 'POST', '/api/orders', 'https://evil.example')).toBe(false);
    expect(allows(g, 'POST', '/api/administrator', STORE)).toBe(true); // not an admin route
    expect(allows(g, 'GET', '/api/admin/orders', 'https://evil.example')).toBe(true);
    expect(allows(g, 'POST', '/api/admin/orders')).toBe(true);
  });

  it('falls back to WEB_ORIGIN without ADMIN_ORIGIN, and to any origin with neither', () => {
    const webOnly = guard({ WEB_ORIGIN: STORE });
    expect(allows(webOnly, 'POST', '/api/auth/login', STORE)).toBe(true);
    expect(allows(webOnly, 'POST', '/api/auth/login', ADMIN)).toBe(false);
    expect(allows(guard({}), 'POST', '/api/auth/login', 'http://localhost:3002')).toBe(true);
  });
});
