import { Body, Controller, Injectable, Logger, Module, Post, UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { createEnquirySchema, HONEYPOT_FIELD, type CreateEnquiry } from '@reactive-store/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { MailService } from '../mail/mail.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class EnquiriesService {
  private readonly logger = new Logger(EnquiriesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  async create(input: CreateEnquiry): Promise<{ received: true }> {
    // A filled honeypot means a bot: answer as if it worked, but save nothing.
    if (input[HONEYPOT_FIELD]) {
      this.logger.warn('Dropped an enquiry with the honeypot field filled.');
      return { received: true };
    }
    await this.prisma.enquiry.create({
      data: {
        name: input.name,
        phone: input.phone,
        role: input.role,
        topic: input.topic ?? null,
        message: input.message,
        locale: input.locale,
      },
    });
    void this.mail.notifyEnquiry(input);
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
