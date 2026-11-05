import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** Routes that only the admin site may call. */
const ADMIN_ONLY = /^\/api\/(?:admin|auth)(?:\/|$)/;

function parseOrigins(value: string | undefined): Set<string> | null {
  const list = (value ?? '')
    .split(',')
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter(Boolean);
  return list.length ? new Set(list) : null;
}

/**
 * Rejects state-changing requests sent by a browser from another site.
 *
 * Browsers always send `Origin` on cross-site POSTs, so a mismatch is refused.
 * Requests without `Origin` (server-to-server calls, curl, tests) are allowed;
 * they carry no browser cookies to abuse.
 *
 * - WEB_ORIGIN: the store (e.g. https://yourstore.com). Checkout and enquiries.
 * - ADMIN_ORIGIN: the admin site (e.g. https://admin.yourstore.com). When set,
 *   /api/auth and /api/admin accept only this origin. This matters because the
 *   two sites are "same-site" to the browser, so SameSite cookies alone wouldn't
 *   stop a page on the store from posting to the admin API.
 *
 * Both may list several origins, comma-separated. Unset means any origin
 * (local development); ADMIN_ORIGIN unset falls back to WEB_ORIGIN.
 */
@Injectable()
export class OriginGuard implements CanActivate {
  private readonly web: Set<string> | null;
  private readonly admin: Set<string> | null;

  constructor(config: ConfigService) {
    this.web = parseOrigins(config.get<string>('WEB_ORIGIN'));
    this.admin = parseOrigins(config.get<string>('ADMIN_ORIGIN')) ?? this.web;
  }

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    if (SAFE_METHODS.has(req.method)) return true;
    const origin = req.headers.origin;
    if (origin === undefined) return true;
    const allowed = ADMIN_ONLY.test(req.path) ? this.admin : this.web;
    if (!allowed || allowed.has(origin)) return true;
    throw new ForbiddenException('Cross-site request refused');
  }
}
