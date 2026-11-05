import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { createOrderSchema, type CreateOrder } from '@reactive-store/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { OrdersService } from './orders.service.js';

@Controller('orders')
@UseGuards(ThrottlerGuard)
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  /** Places an order. 201 with the saved order, 422 if items are unavailable. */
  @Post()
  create(@Body(new ZodValidationPipe(createOrderSchema)) body: CreateOrder) {
    return this.orders.create(body);
  }
}
