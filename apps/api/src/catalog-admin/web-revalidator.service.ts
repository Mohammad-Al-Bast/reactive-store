import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Tells the web app to drop its cached catalogue after an admin edit, so the
 * change is live at once without a redeploy. Calls POST /internal/revalidate on
 * the web server (blocked from the public by Caddy) with a shared secret.
 *
 * Never throws: a failed refresh must not fail the save. Pages then update when
 * their cache expires (within the hour).
 */
@Injectable()
export class WebRevalidator {
  private readonly logger = new Logger(WebRevalidator.name);
  private readonly url: string;
  private readonly secret: string | undefined;

  constructor(config: ConfigService) {
    this.url = `${(config.get<string>('WEB_INTERNAL_URL') || 'http://localhost:3000').replace(/\/$/, '')}/internal/revalidate`;
    this.secret = config.get<string>('REVALIDATE_SECRET') || undefined;
    if (!this.secret) this.logger.warn('REVALIDATE_SECRET is not set: admin edits reach the store within the hour, not at once.');
  }

  /**
   * @param paths Store pages to re-render straight away, without the locale prefix
   *   (e.g. "/", "/shop", "/product/tens"). Everything is refreshed either way.
   */
  async catalogChanged(paths: string[] = ['/', '/shop']): Promise<boolean> {
    if (!this.secret) return false;
    try {
      const res = await fetch(this.url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-revalidate-secret': this.secret },
        body: JSON.stringify({ tags: ['catalog'], paths }),
        signal: AbortSignal.timeout(5_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return true;
    } catch (err) {
      this.logger.warn(`Couldn't refresh the store's cache (${(err as Error).message}); it updates within the hour.`);
      return false;
    }
  }
}
