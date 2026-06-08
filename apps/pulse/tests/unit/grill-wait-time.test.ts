import { describe, expect, it } from 'vitest';
import {
  calculateEstimatedReadyAt,
  calculateEstimatedWaitMinutes,
  calculateOrderItemCount,
} from '@/lib/grill/waitTime';

describe('grill wait time estimates', () => {
  it('uses a 15 minute minimum wait', () => {
    expect(calculateOrderItemCount([{ quantity: 1 }, { quantity: 2 }])).toBe(3);
    expect(calculateEstimatedWaitMinutes([{ quantity: 1 }])).toBe(15);
    expect(calculateEstimatedWaitMinutes([{ quantity: 3 }])).toBe(15);
  });

  it('adds 4 minutes per item after the minimum is exceeded', () => {
    expect(calculateEstimatedWaitMinutes([{ quantity: 4 }])).toBe(16);
    expect(calculateEstimatedWaitMinutes([{ quantity: 2 }, { quantity: 3 }])).toBe(20);
  });

  it('calculates estimated ready time from the requested start time', () => {
    const start = new Date('2026-06-07T17:00:00.000Z');
    const readyAt = calculateEstimatedReadyAt(start, [{ quantity: 5 }]);

    expect(readyAt.toISOString()).toBe('2026-06-07T17:20:00.000Z');
  });
});
