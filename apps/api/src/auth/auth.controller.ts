import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { loginSchema, type AdminProfile } from '@reactive-store/shared';
import type { CookieOptions, Request, Response } from 'express';
import { z } from 'zod';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { CurrentAdmin } from './admin-auth.guard.js';
import {
  ACCESS_COOKIE,
  ACCESS_TTL_SECONDS,
  REFRESH_COOKIE,
  REFRESH_COOKIE_PATH,
  RequireAdmin,
  type AuthenticatedAdmin,
} from './auth.constants.js';
import { AuthService, type Session } from './auth.service.js';

const FIFTEEN_MINUTES = 15 * 60_000;
/** Sign-in attempts per IP every 15 minutes (LOGIN_RATE_LIMIT, default 10). */
const loginLimit = () => Number(process.env.LOGIN_RATE_LIMIT || 10);

@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  private readonly secure: boolean;

  constructor(
    private readonly auth: AuthService,
    config: ConfigService,
  ) {
    // Secure cookies need HTTPS; default on in production, off for http://localhost.
    const flag = config.get<string>('COOKIE_SECURE');
    this.secure = flag ? flag === 'true' : config.get<string>('NODE_ENV') === 'production';
  }

  /** Signs in and sets the session cookies. 401 with one generic message for any mistake. */
  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: loginLimit, ttl: FIFTEEN_MINUTES } })
  async login(
    @Body(new ZodValidationPipe(loginSchema)) body: z.output<typeof loginSchema>,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ admin: AdminProfile }> {
    const session = await this.auth.login(body.email, body.password, req.get('user-agent'));
    this.setCookies(res, session);
    return { admin: session.admin };
  }

  /** Rotates the refresh token and issues a new access token. */
  @Post('refresh')
  @HttpCode(200)
  @Throttle({ default: { limit: 120, ttl: FIFTEEN_MINUTES } })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<{ admin: AdminProfile }> {
    try {
      const session = await this.auth.refresh(req.cookies?.[REFRESH_COOKIE], req.get('user-agent'));
      this.setCookies(res, session);
      return { admin: session.admin };
    } catch (err) {
      this.clearCookies(res);
      throw err;
    }
  }

  /** Signs out this browser. Always succeeds. */
  @Post('logout')
  @HttpCode(204)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(req.cookies?.[REFRESH_COOKIE]);
    this.clearCookies(res);
  }

  /** Signs this admin out on every device, including this one. */
  @Post('logout-all')
  @HttpCode(204)
  @RequireAdmin()
  async logoutAll(@CurrentAdmin() admin: AuthenticatedAdmin, @Res({ passthrough: true }) res: Response) {
    await this.auth.revokeAll(admin.id);
    this.clearCookies(res);
  }

  @Get('me')
  @RequireAdmin()
  me(@CurrentAdmin() admin: AuthenticatedAdmin): Promise<AdminProfile> {
    return this.auth.profile(admin.id);
  }

  private base(): CookieOptions {
    return { httpOnly: true, sameSite: 'lax', secure: this.secure };
  }

  private setCookies(res: Response, session: Session) {
    res.cookie(ACCESS_COOKIE, session.accessToken, {
      ...this.base(),
      path: '/',
      maxAge: ACCESS_TTL_SECONDS * 1000,
    });
    res.cookie(REFRESH_COOKIE, session.refreshToken, {
      ...this.base(),
      path: REFRESH_COOKIE_PATH,
      expires: session.refreshExpiresAt,
    });
  }

  private clearCookies(res: Response) {
    res.clearCookie(ACCESS_COOKIE, { ...this.base(), path: '/' });
    res.clearCookie(REFRESH_COOKIE, { ...this.base(), path: REFRESH_COOKIE_PATH });
  }
}
