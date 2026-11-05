import { Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { randomBytes } from 'node:crypto';
import { AdminAuthGuard } from './admin-auth.guard.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';

function jwtSecret(config: ConfigService) {
  const secret = config.get<string>('JWT_SECRET');
  if (secret && secret.length >= 32) return secret;
  if (config.get<string>('NODE_ENV') === 'production') {
    throw new Error('JWT_SECRET must be set to at least 32 characters in production.');
  }
  new Logger('AuthModule').warn('JWT_SECRET is not set: using a random one, so admins sign in again after a restart.');
  return randomBytes(32).toString('hex');
}

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: jwtSecret(config),
        signOptions: { algorithm: 'HS256', issuer: 'reactive-store-api' },
        verifyOptions: { algorithms: ['HS256'], issuer: 'reactive-store-api' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, { provide: APP_GUARD, useClass: AdminAuthGuard }],
  exports: [AuthService],
})
export class AuthModule {}
