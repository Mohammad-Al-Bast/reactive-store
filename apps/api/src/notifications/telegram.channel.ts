import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { listFromEnv, PermanentSendError, RetryLaterError, type NotificationSender } from './channel.js';

/** Telegram's limit is 4096 characters per message. */
const MAX_LENGTH = 4000;

type TelegramResponse = {
  ok: boolean;
  description?: string;
  error_code?: number;
  parameters?: { retry_after?: number };
};

/**
 * Sends alerts with a Telegram bot (Bot API `sendMessage`).
 * Needs TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_IDS (comma-separated: people or a group).
 * `npm run telegram:setup -w @reactive-store/api` finds the chat ids.
 */
@Injectable()
export class TelegramChannel implements NotificationSender {
  readonly enabled: boolean;
  readonly targets: string[];
  private readonly token: string | undefined;

  constructor(config: ConfigService) {
    this.token = config.get<string>('TELEGRAM_BOT_TOKEN') || undefined;
    this.targets = listFromEnv(config.get<string>('TELEGRAM_CHAT_IDS'));
    this.enabled = Boolean(this.token && this.targets.length);
  }

  async send(chatId: string, { text }: { text: string }) {
    if (!this.token) throw new PermanentSendError('TELEGRAM_BOT_TOKEN is not set');
    const body = text.length > MAX_LENGTH ? `${text.slice(0, MAX_LENGTH)}…` : text;

    let res: Response;
    try {
      res = await fetch(`https://api.telegram.org/bot${this.token}/sendMessage`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: body,
          link_preview_options: { is_disabled: true },
        }),
        signal: AbortSignal.timeout(10_000),
      });
    } catch (err) {
      // Network error or timeout: worth retrying.
      throw new Error(`Telegram unreachable: ${(err as Error).message}`);
    }

    const json = (await res.json().catch(() => ({ ok: false }))) as TelegramResponse;
    if (res.ok && json.ok) return;

    const reason = `Telegram ${res.status}: ${json.description ?? 'unknown error'}`;
    if (res.status === 429) throw new RetryLaterError(reason, json.parameters?.retry_after ?? 30);
    // Bad request, bad token, bot blocked or removed, chat not found.
    if ([400, 401, 403, 404].includes(res.status)) throw new PermanentSendError(reason);
    throw new Error(reason);
  }
}
