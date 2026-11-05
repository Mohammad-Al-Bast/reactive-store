import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { configureApp } from './app.setup.js';
import { uploadDir } from './catalog-admin/image-storage.service.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // Behind Caddy, set TRUST_PROXY=1 so rate limits see the client's IP, not the proxy's.
  // Leave it unset when the API is reachable directly, or clients could fake their IP.
  const trustProxy = process.env.TRUST_PROXY;
  if (trustProxy) app.set('trust proxy', /^\d+$/.test(trustProxy) ? Number(trustProxy) : trustProxy);
  configureApp(app);
  // Uploaded product photos. In production Caddy serves this folder directly; this
  // covers development and any request that reaches the API.
  app.useStaticAssets(uploadDir(app.get(ConfigService)), {
    prefix: '/uploads/',
    maxAge: '30d',
    immutable: true,
    index: false,
    dotfiles: 'deny',
  });
  app.enableShutdownHooks();
  await app.listen(process.env.PORT ?? 3001);
}
await bootstrap();
