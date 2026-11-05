import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  buildOrderMessage,
  paymentMethodLabels,
  type CreateEnquiry,
  type OrderSummary,
} from '@reactive-store/shared';
import nodemailer, { type Transporter } from 'nodemailer';

const STORE_NAME = 'Reactive Store';

/**
 * Store alerts by email over SMTP, so the provider can be swapped by changing env
 * vars. With no SMTP_HOST set (local development) alerts are logged and skipped.
 *
 * Callers must not let a failed alert fail the request: use `notify*` methods,
 * which never throw.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter | null;
  private readonly from: string;
  private readonly alertTo: string | undefined;

  constructor(config: ConfigService) {
    const host = config.get<string>('SMTP_HOST');
    const port = Number(config.get<string>('SMTP_PORT') ?? 587);
    this.from = config.get<string>('SMTP_FROM') ?? `${STORE_NAME} <no-reply@localhost>`;
    this.alertTo = config.get<string>('ORDER_ALERT_TO');
    this.transporter = host
      ? nodemailer.createTransport({
          host,
          port,
          secure: port === 465,
          auth: config.get('SMTP_USER')
            ? { user: config.get<string>('SMTP_USER')!, pass: config.get<string>('SMTP_PASS') ?? '' }
            : undefined,
        })
      : null;
    if (!this.transporter || !this.alertTo) {
      this.logger.warn('SMTP_HOST or ORDER_ALERT_TO is not set: store email alerts are disabled.');
    }
  }

  notifyOrder(order: OrderSummary) {
    const text = buildOrderMessage(order, {
      storeName: STORE_NAME,
      paymentLabel: paymentMethodLabels[order.paymentMethod],
    });
    return this.send(`New order ${order.number}`, text);
  }

  notifyEnquiry(enquiry: CreateEnquiry) {
    const text = [
      `New enquiry from ${enquiry.name} (${enquiry.role})`,
      enquiry.topic ? `Topic: ${enquiry.topic}` : null,
      `Phone: ${enquiry.phone}`,
      '',
      enquiry.message,
    ]
      .filter((l) => l !== null)
      .join('\n');
    return this.send(`New enquiry from ${enquiry.name}`, text);
  }

  /** Never throws; failures are logged. Resolves to whether the email was sent. */
  private async send(subject: string, text: string): Promise<boolean> {
    if (!this.transporter || !this.alertTo) return false;
    try {
      await this.transporter.sendMail({ from: this.from, to: this.alertTo, subject, text });
      return true;
    } catch (err) {
      this.logger.error(`Failed to send "${subject}": ${(err as Error).message}`);
      return false;
    }
  }
}
