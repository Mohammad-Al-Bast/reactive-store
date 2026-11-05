import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Rejects state-changing requests sent by a browser from another site.
 *
 * Browsers always send `Origin` on cross-site POSTs, so a mismatch is refused.
 * Requests without `Origin` (server-to-server calls, curl, tests) are allowed;
 * they carry no browser cookies to abuse. WEB_ORIGIN may list several origins,
 * comma-separated. If it is unset (local development), every origin is allowed.
 */
@Injectable()
export class OriginGuard implements CanActivate {
  private readonly allowed: Set<string> | null;

  constructor(config: ConfigService) {
    const origins = config.get<string>('WEB_ORIGIN');
    this.allowed = origins
      ? new Set(origins.split(',').map((o) => o.trim().replace(/\/$/, '')).filter(Boolean))
      : null;
  }

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    if (!this.allowed || SAFE_METHODS.has(req.method)) return true;
    const origin = req.headers.origin;
    if (origin === undefined || this.allowed.has(origin)) return true;
    throw new ForbiddenException('Cross-site request refused');
  }
}
