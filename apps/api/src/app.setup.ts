import type { INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';

/** Settings shared by main.ts and the e2e tests, so tests run the same app as production. */
export function configureApp(app: INestApplication) {
  // Caddy routes /api/* to this service, so every route lives under /api.
  app.setGlobalPrefix('api');
  app.use(cookieParser());
  return app;
}
