import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';
import { listFromEnv, type NotificationSender } from './channel.js';

/**
 * Sends alerts by email over SMTP, so the provider can be swapped with env vars.
 * Needs SMTP_HOST and ORDER_ALERT_TO (comma-separated addresses).
 */
@Injectable()
export class EmailChannel implements NotificationSender {
  readonly enabled: boolean;
  readonly targets: string[];
  private readonly transporter: Transporter | null;
  private readonly from: string;

  constructor(config: ConfigService) {
    const host = config.get<string>('SMTP_HOST') || undefined;
    const port = Number(config.get<string>('SMTP_PORT') || 587);
    const user = config.get<string>('SMTP_USER') || undefined;
    this.from = config.get<string>('SMTP_FROM') || 'Reactive Store <no-reply@localhost>';
    this.targets = listFromEnv(config.get<string>('ORDER_ALERT_TO'));
    this.transporter = host
      ? nodemailer.createTransport({
          host,
          port,
          secure: port === 465,
          auth: user ? { user, pass: config.get<string>('SMTP_PASS') ?? '' } : undefined,
        })
      : null;
    this.enabled = Boolean(this.transporter && this.targets.length);
  }

  async send(to: string, { subject, text }: { subject?: string | null; text: string }) {
    if (!this.transporter) throw new Error('SMTP_HOST is not set');
    await this.transporter.sendMail({ from: this.from, to, subject: subject ?? 'Reactive Store alert', text });
  }
}
