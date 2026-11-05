import { orderStatusTransitions } from '@reactive-store/shared';
import { startOfTodayIn } from './admin.controller.js';

describe('startOfTodayIn', () => {
  it('gives midnight in Beirut as a UTC instant', () => {
    // 23:30 UTC on 4 Nov is 01:30 on 5 Nov in Beirut (UTC+2), so "today" began at 22:00 UTC on 4 Nov.
    expect(startOfTodayIn('Asia/Beirut', new Date('2026-11-04T23:30:00Z')).toISOString()).toBe('2026-11-04T22:00:00.000Z');
    expect(startOfTodayIn('Asia/Beirut', new Date('2026-11-05T12:00:00Z')).toISOString()).toBe('2026-11-04T22:00:00.000Z');
  });
});

describe('orderStatusTransitions', () => {
  it('never lets a delivered order be cancelled, and every status can move somewhere', () => {
    expect(orderStatusTransitions.delivered).not.toContain('cancelled');
    for (const next of Object.values(orderStatusTransitions)) expect(next.length).toBeGreaterThan(0);
  });
});
