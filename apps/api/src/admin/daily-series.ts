import type { AdminDailyPoint } from '@reactive-store/shared';

/** "2026-11-05" for an instant, as the calendar date in `timeZone`. */
export function dateKeyIn(timeZone: string) {
  const format = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });
  return (d: Date) => format.format(d);
}

/**
 * Orders and sales per calendar day for the last `days` days (today included),
 * oldest first, with empty days filled in as zero. Sales are the priced subtotal
 * of orders that weren't cancelled.
 */
export function buildDailySeries(
  orders: { createdAt: Date; subtotal: number; status: string }[],
  opts: { days: number; timeZone: string; now?: Date },
): AdminDailyPoint[] {
  const key = dateKeyIn(opts.timeZone);
  const now = opts.now ?? new Date();
  const points = new Map<string, AdminDailyPoint>();
  // Walk back a day at a time from noon, so daylight-saving changes never skip or repeat a date.
  const noon = new Date(`${key(now)}T12:00:00Z`);
  for (let i = opts.days - 1; i >= 0; i--) {
    const date = new Date(noon.getTime() - i * 86_400_000).toISOString().slice(0, 10);
    points.set(date, { date, orders: 0, sales: 0 });
  }
  for (const o of orders) {
    const point = points.get(key(o.createdAt));
    if (!point) continue;
    point.orders += 1;
    if (o.status !== 'cancelled') point.sales = Math.round((point.sales + o.subtotal) * 100) / 100;
  }
  return [...points.values()];
}
