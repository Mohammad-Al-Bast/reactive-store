import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { AdminModule } from './admin/admin.module.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { CatalogModule } from './catalog/catalog.module.js';
import { OriginGuard } from './common/origin.guard.js';
import { EnquiriesModule } from './enquiries/enquiries.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { OrdersModule } from './orders/orders.module.js';
import { PrismaModule } from './prisma/prisma.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Limits for public form submissions (orders, enquiries), per client IP.
    // In-memory storage is fine for a single API instance; use Redis if scaled out.
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        { ttl: 10 * 60_000, limit: Number(config.get('SUBMIT_RATE_LIMIT') ?? 5) },
      ],
    }),
    PrismaModule,
    NotificationsModule,
    AuthModule,
    AdminModule,
    CatalogModule,
    OrdersModule,
    EnquiriesModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: OriginGuard }],
})
export class AppModule {}
