import { Module } from '@nestjs/common';
import { AdminOrdersService } from './admin-orders.service.js';
import { AdminController } from './admin.controller.js';

@Module({
  controllers: [AdminController],
  providers: [AdminOrdersService],
})
export class AdminModule {}
