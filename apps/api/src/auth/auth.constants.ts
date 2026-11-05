import { SetMetadata } from '@nestjs/common';

/** Short-lived access JWT. Path `/` so the admin pages can forward it to the API. */
export const ACCESS_COOKIE = 'rs_admin';
export const ACCESS_TTL_SECONDS = 15 * 60;

/** Long-lived refresh token, only ever sent to the auth endpoints. */
export const REFRESH_COOKIE = 'rs_admin_refresh';
export const REFRESH_COOKIE_PATH = '/api/auth';
export const REFRESH_TTL_DAYS = 30;

/**
 * A rotated refresh token presented again within this window is treated as a
 * race between two tabs, not theft: the request fails, but sessions survive.
 */
export const ROTATION_GRACE_MS = 30_000;

/** Every route under this path requires a signed-in admin. */
export const ADMIN_PATH_PREFIX = '/api/admin';

export const REQUIRE_ADMIN = 'requireAdmin';
/** Requires a signed-in admin on a route outside /api/admin (e.g. /api/auth/me). */
export const RequireAdmin = () => SetMetadata(REQUIRE_ADMIN, true);

export type AccessPayload = { sub: string; sid: string };
export type AuthenticatedAdmin = { id: string; sessionId: string };
