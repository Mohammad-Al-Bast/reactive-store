import { Injectable, Logger, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { AdminProfile } from '@reactive-store/shared';
import argon2 from 'argon2';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  ACCESS_TTL_SECONDS,
  REFRESH_TTL_DAYS,
  ROTATION_GRACE_MS,
  type AccessPayload,
} from './auth.constants.js';

export type Session = {
  admin: AdminProfile;
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
  /** Id of the new refresh-token row. */
  tokenId: string;
};

const INVALID_LOGIN = 'Email or password is incorrect.';

/** Only a SHA-256 of each refresh token is stored, so a database leak can't be replayed. */
export function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

const profile = (u: { id: string; email: string; name: string }): AdminProfile => ({
  id: u.id,
  email: u.email,
  name: u.name,
});

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);
  /** Verified against when the email is unknown, so response time doesn't reveal which emails exist. */
  private dummyHash = '';

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async onModuleInit() {
    this.dummyHash = await argon2.hash(randomBytes(16).toString('hex'));
  }

  async login(email: string, password: string, userAgent?: string): Promise<Session> {
    const user = await this.prisma.adminUser.findUnique({ where: { email } });
    const valid = user?.isActive
      ? await argon2.verify(user.passwordHash, password)
      : (await argon2.verify(this.dummyHash, password), false);
    if (!user || !valid) throw new UnauthorizedException(INVALID_LOGIN);

    await this.prisma.adminUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    return this.issue(user, randomUUID(), userAgent);
  }

  /**
   * Swaps a refresh token for a new pair. Each token works once: presenting a
   * rotated token again means it was copied, so every session of that admin is
   * revoked (except within a short grace window, for two tabs refreshing at once).
   */
  async refresh(token: string | undefined, userAgent?: string): Promise<Session> {
    if (!token) throw new UnauthorizedException('Not signed in.');
    const row = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { adminUser: true },
    });
    if (!row) throw new UnauthorizedException('Not signed in.');

    const now = Date.now();
    if (row.revokedAt) {
      const recentRotation = row.replacedById && now - row.revokedAt.getTime() < ROTATION_GRACE_MS;
      if (!recentRotation) {
        await this.revokeAll(row.adminUserId);
        this.logger.warn(`Refresh token reuse for admin ${row.adminUser.email}: all sessions revoked.`);
      }
      throw new UnauthorizedException('Session expired. Please sign in again.');
    }
    if (row.expiresAt.getTime() <= now || !row.adminUser.isActive) {
      throw new UnauthorizedException('Session expired. Please sign in again.');
    }

    return this.prisma.$transaction(async (tx) => {
      // Claim the old token atomically, so two simultaneous refreshes can't both succeed.
      const claimed = await tx.refreshToken.updateMany({
        where: { id: row.id, revokedAt: null },
        data: { revokedAt: new Date(now) },
      });
      if (!claimed.count) throw new UnauthorizedException('Session expired. Please sign in again.');
      const session = await this.issue(row.adminUser, row.familyId, userAgent, tx);
      await tx.refreshToken.update({ where: { id: row.id }, data: { replacedById: session.tokenId } });
      return session;
    });
  }

  /** Ends this browser's session (every token in its family). */
  async logout(token: string | undefined) {
    if (!token) return;
    const row = await this.prisma.refreshToken.findUnique({ where: { tokenHash: hashToken(token) } });
    if (row) await this.revokeSession(row.familyId);
  }

  async revokeSession(familyId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /** Signs an admin out on every device. */
  async revokeAll(adminUserId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { adminUserId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /** Checks an access token and that its session is still live (not signed out, admin active). */
  async verifyAccess(token: string | undefined): Promise<AccessPayload | null> {
    if (!token) return null;
    let payload: AccessPayload;
    try {
      payload = await this.jwt.verifyAsync<AccessPayload>(token);
    } catch {
      return null;
    }
    const live = await this.prisma.refreshToken.count({
      where: {
        familyId: payload.sid,
        adminUserId: payload.sub,
        revokedAt: null,
        expiresAt: { gt: new Date() },
        adminUser: { isActive: true },
      },
    });
    return live ? payload : null;
  }

  async profile(adminUserId: string): Promise<AdminProfile> {
    const user = await this.prisma.adminUser.findUnique({ where: { id: adminUserId } });
    if (!user) throw new UnauthorizedException();
    return profile(user);
  }

  private async issue(
    user: { id: string; email: string; name: string },
    familyId: string,
    userAgent?: string,
    db: Prisma.TransactionClient = this.prisma,
  ): Promise<Session> {
    const refreshToken = randomBytes(32).toString('base64url');
    const refreshExpiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 86_400_000);
    const row = await db.refreshToken.create({
      data: {
        adminUserId: user.id,
        familyId,
        tokenHash: hashToken(refreshToken),
        expiresAt: refreshExpiresAt,
        userAgent: userAgent?.slice(0, 300),
      },
      select: { id: true },
    });
    const payload: AccessPayload = { sub: user.id, sid: familyId };
    const accessToken = await this.jwt.signAsync(payload, { expiresIn: ACCESS_TTL_SECONDS });
    return { admin: profile(user), accessToken, refreshToken, refreshExpiresAt, tokenId: row.id };
  }
}
