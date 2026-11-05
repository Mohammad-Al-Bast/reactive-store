import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CreateEnquiry, OrderSummary } from '@reactive-store/shared';
import type { Notification, NotificationChannel, Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { enquiryAlert, orderChatAlert, orderEmailAlert, type AlertMessage } from './alerts.js';
import { PermanentSendError, RetryLaterError, type NotificationSender } from './channel.js';
import { EmailChannel } from './email.channel.js';
import { TelegramChannel } from './telegram.channel.js';

export const MAX_ATTEMPTS = 8;
const POLL_MS = 5_000;
const BATCH = 20;
/** A row left in `sending` this long was claimed by a sender that died. */
const STUCK_MS = 5 * 60_000;

/** Wait before attempt n+1: 30s, 1m, 2m, 5m, 15m, 30m, 1h. */
export function backoffMs(attempts: number) {
  const steps = [30, 60, 120, 300, 900, 1800, 3600];
  return steps[Math.min(attempts, steps.length) - 1]! * 1000;
}

type Tx = Prisma.TransactionClient;

/**
 * Staff alerts through an outbox table.
 *
 * `queueOrder` / `queueEnquiry` run inside the caller's transaction, so an alert
 * exists if and only if the order or enquiry does. A sender loop in this process
 * delivers due rows, retrying with backoff. `kick()` after a commit sends at once
 * instead of waiting for the next poll.
 */
@Injectable()
export class NotificationsService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly senders: Record<NotificationChannel, NotificationSender>;
  private readonly adminUrl: string | undefined;
  private readonly workerEnabled: boolean;
  private timer: NodeJS.Timeout | undefined;
  private running: Promise<void> | null = null;
  private again = false;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
    telegram: TelegramChannel,
    email: EmailChannel,
  ) {
    this.senders = { telegram, email };
    this.adminUrl = config.get<string>('ADMIN_URL') || undefined;
    this.workerEnabled = config.get<string>('NOTIFICATIONS_WORKER') !== 'off';
  }

  onApplicationBootstrap() {
    for (const [name, sender] of Object.entries(this.senders)) {
      if (sender.enabled) this.logger.log(`${name} alerts on, to ${sender.targets.length} recipient(s).`);
      else this.logger.warn(`${name} alerts are off: see apps/api/.env.example.`);
    }
    if (!this.workerEnabled) return;
    this.timer = setInterval(() => this.kick(), POLL_MS);
    this.timer.unref();
    this.kick();
  }

  async onApplicationShutdown() {
    clearInterval(this.timer);
    await this.running;
  }

  /* ---------- Queueing (inside the caller's transaction) ---------- */

  async queueOrder(tx: Tx, orderId: string, order: OrderSummary) {
    await this.queue(tx, { orderId }, {
      telegram: orderChatAlert(order, this.adminUrl),
      email: orderEmailAlert(order, this.adminUrl),
    });
  }

  async queueEnquiry(tx: Tx, enquiryId: string, enquiry: CreateEnquiry) {
    const alert = enquiryAlert(enquiry);
    await this.queue(tx, { enquiryId }, { telegram: alert, email: alert });
  }

  private async queue(
    tx: Tx,
    link: { orderId?: string; enquiryId?: string },
    messages: Record<NotificationChannel, AlertMessage>,
  ) {
    const data = (Object.keys(this.senders) as NotificationChannel[])
      .filter((channel) => this.senders[channel].enabled)
      .flatMap((channel) =>
        this.senders[channel].targets.map((target) => ({
          channel,
          target,
          subject: messages[channel].subject,
          text: messages[channel].text,
          ...link,
        })),
      );
    if (data.length) await tx.notification.createMany({ data });
  }

  /* ---------- Delivery ---------- */

  /** Delivers due alerts soon, without waiting. Never throws. */
  kick() {
    if (!this.workerEnabled) return;
    void this.processDue().catch((err: Error) => this.logger.error(`Alert sender failed: ${err.message}`));
  }

  /** Delivers every due alert. Concurrent calls share one run. */
  processDue(): Promise<void> {
    if (this.running) {
      this.again = true;
      return this.running;
    }
    this.running = (async () => {
      try {
        do {
          this.again = false;
          await this.releaseStuck();
          let due: Notification[];
          do {
            due = await this.prisma.notification.findMany({
              where: { status: 'pending', nextAttemptAt: { lte: new Date() } },
              orderBy: { createdAt: 'asc' },
              take: BATCH,
            });
            for (const n of due) await this.deliver(n);
          } while (due.length === BATCH);
        } while (this.again);
      } finally {
        this.running = null;
      }
    })();
    return this.running;
  }

  private async releaseStuck() {
    await this.prisma.notification.updateMany({
      where: { status: 'sending', updatedAt: { lt: new Date(Date.now() - STUCK_MS) } },
      data: { status: 'pending' },
    });
  }

  private async deliver(n: Notification) {
    // Claim the row first, so two senders (e.g. two API instances) never send it twice.
    const claimed = await this.prisma.notification.updateMany({
      where: { id: n.id, status: 'pending' },
      data: { status: 'sending', attempts: { increment: 1 } },
    });
    if (!claimed.count) return;
    const attempts = n.attempts + 1;

    try {
      await this.senders[n.channel].send(n.target, { subject: n.subject, text: n.text });
      await this.prisma.notification.update({
        where: { id: n.id },
        data: { status: 'sent', sentAt: new Date(), lastError: null },
      });
    } catch (err) {
      const message = (err as Error).message.slice(0, 500);
      const giveUp = err instanceof PermanentSendError || attempts >= MAX_ATTEMPTS;
      const waitMs = err instanceof RetryLaterError ? err.retryAfterSeconds * 1000 : backoffMs(attempts);
      await this.prisma.notification.update({
        where: { id: n.id },
        data: giveUp
          ? { status: 'failed', lastError: message }
          : { status: 'pending', lastError: message, nextAttemptAt: new Date(Date.now() + waitMs) },
      });
      const log = `${n.channel} alert to ${n.target} failed (attempt ${attempts}): ${message}`;
      if (giveUp) this.logger.error(`${log}. Giving up.`);
      else this.logger.warn(`${log}. Retrying in ${Math.round(waitMs / 1000)}s.`);
    }
  }
}
