import { Global, Module } from '@nestjs/common';
import { EmailChannel } from './email.channel.js';
import { NotificationsService } from './notifications.service.js';
import { TelegramChannel } from './telegram.channel.js';

@Global()
@Module({
  providers: [TelegramChannel, EmailChannel, NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
