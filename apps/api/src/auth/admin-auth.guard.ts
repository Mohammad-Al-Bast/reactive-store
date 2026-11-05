import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import {
  ACCESS_COOKIE,
  ADMIN_PATH_PREFIX,
  REQUIRE_ADMIN,
  type AuthenticatedAdmin,
} from './auth.constants.js';
import { AuthService } from './auth.service.js';

type AdminRequest = Request & { admin?: AuthenticatedAdmin };

/**
 * Global guard. Every route under /api/admin requires a signed-in admin, so a new
 * admin controller is protected without remembering to add anything. Other routes
 * opt in with @RequireAdmin().
 */
@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(
    private readonly auth: AuthService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AdminRequest>();
    const path = req.originalUrl.split('?')[0]!;
    const isAdminPath = path === ADMIN_PATH_PREFIX || path.startsWith(`${ADMIN_PATH_PREFIX}/`);
    const required =
      isAdminPath ||
      this.reflector.getAllAndOverride<boolean>(REQUIRE_ADMIN, [context.getHandler(), context.getClass()]);
    if (!required) return true;

    const payload = await this.auth.verifyAccess(req.cookies?.[ACCESS_COOKIE]);
    if (!payload) throw new UnauthorizedException('Not signed in.');
    req.admin = { id: payload.sub, sessionId: payload.sid };
    return true;
  }
}

/** The signed-in admin on a protected route. */
export const CurrentAdmin = createParamDecorator((_: unknown, context: ExecutionContext) => {
  const admin = context.switchToHttp().getRequest<AdminRequest>().admin;
  if (!admin) throw new UnauthorizedException();
  return admin;
});
