import { Body, Controller, Injectable, Logger, Module, Post, UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { createEnquirySchema, HONEYPOT_FIELD, type CreateEnquiry } from '@reactive-store/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class EnquiriesService {
  private readonly logger = new Logger(EnquiriesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(input: CreateEnquiry): Promise<{ received: true }> {
    // A filled honeypot means a bot: answer as if it worked, but save nothing.
    if (input[HONEYPOT_FIELD]) {
      this.logger.warn('Dropped an enquiry with the honeypot field filled.');
      return { received: true };
    }
    await this.prisma.$transaction(async (tx) => {
      const enquiry = await tx.enquiry.create({
        data: {
          name: input.name,
          phone: input.phone,
          role: input.role,
          topic: input.topic ?? null,
          message: input.message,
          locale: input.locale,
        },
        select: { id: true },
      });
      await this.notifications.queueEnquiry(tx, enquiry.id, input);
    });
    this.notifications.kick();
    return { received: true };
  }
}

@Controller('enquiries')
@UseGuards(ThrottlerGuard)
export class EnquiriesController {
  constructor(private readonly enquiries: EnquiriesService) {}

  @Post()
  create(@Body(new ZodValidationPipe(createEnquirySchema)) body: CreateEnquiry) {
    return this.enquiries.create(body);
  }
}

@Module({
  controllers: [EnquiriesController],
  providers: [EnquiriesService],
})
export class EnquiriesModule {}
