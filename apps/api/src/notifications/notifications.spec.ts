import { ConfigService } from '@nestjs/config';
import type { OrderSummary } from '@reactive-store/shared';
import { orderChatAlert, orderEmailAlert } from './alerts.js';
import { PermanentSendError, RetryLaterError } from './channel.js';
import { backoffMs, MAX_ATTEMPTS } from './notifications.service.js';
import { TelegramChannel } from './telegram.channel.js';

const order: OrderSummary = {
  number: 'RS-261105-K3QZ7W',
  createdAt: '2026-11-05T10:00:00.000Z',
  items: [
    { slug: 'tens', name: 'TENS Unit', qty: 2, unitPrice: 70 },
    { slug: 'gel', name: 'Gel', qty: 1, unitPrice: null },
  ],
  subtotal: 140,
  totalToConfirm: true,
  paymentMethod: 'wallet',
  customer: { name: 'Rana', phone: '81 164 065', governorate: 'Bekaa', city: 'Shtoura', address: 'Bldg 4', notes: 'Call after 5' },
};

describe('orderChatAlert', () => {
  it('fits the essentials on a phone screen, with a dashboard link', () => {
    const { text } = orderChatAlert(order, 'https://shop.example/admin/');
    expect(text.split('\n').slice(0, 2)).toEqual([
      '🛒 New order RS-261105-K3QZ7W',
      '3 items · $140.00 + items on request · Whish / OMT',
    ]);
    expect(text).toContain('Rana · 81 164 065');
    expect(text).toContain('• 1 × Gel — price on request');
    expect(text).toContain('Notes: Call after 5');
    expect(text).toContain('Open in dashboard: https://shop.example/admin/orders/RS-261105-K3QZ7W');
  });

  it('leaves out the link until ADMIN_URL is set', () => {
    expect(orderChatAlert(order).text).not.toContain('dashboard');
    expect(orderEmailAlert(order).text).not.toContain('dashboard');
  });
});

describe('backoffMs', () => {
  it('waits longer after each failure, up to an hour', () => {
    const waits = Array.from({ length: MAX_ATTEMPTS }, (_, i) => backoffMs(i + 1) / 1000);
    expect(waits).toEqual([30, 60, 120, 300, 900, 1800, 3600, 3600]);
  });
});

describe('TelegramChannel', () => {
  const channel = (env: Record<string, string>) => new TelegramChannel(new ConfigService(env));
  const configured = () => channel({ TELEGRAM_BOT_TOKEN: '123:abc', TELEGRAM_CHAT_IDS: '111, -100222 ,' });
  const reply = (status: number, body: object) => vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }));

  afterEach(() => vi.unstubAllGlobals());

  it('is off until both the token and a chat id are set', () => {
    expect(channel({}).enabled).toBe(false);
    expect(channel({ TELEGRAM_BOT_TOKEN: '123:abc' }).enabled).toBe(false);
    expect(configured()).toMatchObject({ enabled: true, targets: ['111', '-100222'] });
  });

  it('calls sendMessage with the chat id and text', async () => {
    const fetch = reply(200, { ok: true });
    vi.stubGlobal('fetch', fetch);
    await configured().send('111', { text: 'Hello' });
    const [url, init] = fetch.mock.calls[0]!;
    expect(url).toBe('https://api.telegram.org/bot123:abc/sendMessage');
    expect(JSON.parse(init.body)).toMatchObject({ chat_id: '111', text: 'Hello' });
  });

  it('asks to retry later on 429, using Telegram’s wait time', async () => {
    vi.stubGlobal('fetch', reply(429, { ok: false, description: 'Too Many Requests', parameters: { retry_after: 12 } }));
    const err = await configured().send('111', { text: 'x' }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(RetryLaterError);
    expect((err as RetryLaterError).retryAfterSeconds).toBe(12);
  });

  it('gives up at once when the chat or token is wrong', async () => {
    vi.stubGlobal('fetch', reply(400, { ok: false, description: 'Bad Request: chat not found' }));
    await expect(configured().send('999', { text: 'x' })).rejects.toBeInstanceOf(PermanentSendError);
  });

  it('treats network failures and server errors as worth retrying', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')));
    const network = await configured().send('111', { text: 'x' }).catch((e: unknown) => e);
    expect(network).not.toBeInstanceOf(PermanentSendError);

    vi.stubGlobal('fetch', reply(502, { ok: false }));
    const server = await configured().send('111', { text: 'x' }).catch((e: unknown) => e);
    expect(server).toBeInstanceOf(Error);
    expect(server).not.toBeInstanceOf(PermanentSendError);
  });
});
