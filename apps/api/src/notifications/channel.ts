/** A way of delivering a staff alert. `send` throws on failure; the outbox decides what to do. */
export interface NotificationSender {
  /** True when the env vars it needs are set. */
  readonly enabled: boolean;
  /** Who receives alerts on this channel (chat ids, email addresses). */
  readonly targets: string[];
  send(target: string, message: { subject?: string | null; text: string }): Promise<void>;
}

/** Retrying cannot help (bad token, unknown chat, bot blocked): stop at once. */
export class PermanentSendError extends Error {}

/** The provider asked us to wait before trying again. */
export class RetryLaterError extends Error {
  constructor(
    message: string,
    readonly retryAfterSeconds: number,
  ) {
    super(message);
  }
}

/** Splits a comma-separated env var into trimmed, non-empty values. */
export function listFromEnv(value: string | undefined) {
  return (value ?? '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}
