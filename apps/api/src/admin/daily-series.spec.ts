import { describe, expect, it } from 'vitest';
import { buildDailySeries } from './daily-series.js';

describe('buildDailySeries', () => {
  const now = new Date('2026-11-05T10:00:00Z'); // 12:00 in Beirut

  it('returns one point per day, oldest first, ending today', () => {
    const series = buildDailySeries([], { days: 3, timeZone: 'Asia/Beirut', now });
    expect(series.map((p) => p.date)).toEqual(['2026-11-03', '2026-11-04', '2026-11-05']);
    expect(series.every((p) => p.orders === 0 && p.sales === 0)).toBe(true);
  });

  it('buckets orders by the Beirut date and leaves cancelled orders out of sales', () => {
    const series = buildDailySeries(
      [
        { createdAt: new Date('2026-11-04T22:30:00Z'), subtotal: 70, status: 'new' }, // 00:30 on the 5th in Beirut
        { createdAt: new Date('2026-11-05T08:00:00Z'), subtotal: 12.5, status: 'delivered' },
        { createdAt: new Date('2026-11-05T09:00:00Z'), subtotal: 40, status: 'cancelled' },
        { createdAt: new Date('2026-11-04T08:00:00Z'), subtotal: 0, status: 'confirmed' },
        { createdAt: new Date('2026-10-01T08:00:00Z'), subtotal: 99, status: 'new' }, // outside the window
      ],
      { days: 2, timeZone: 'Asia/Beirut', now },
    );
    expect(series).toEqual([
      { date: '2026-11-04', orders: 1, sales: 0 },
      { date: '2026-11-05', orders: 3, sales: 82.5 },
    ]);
  });
});
