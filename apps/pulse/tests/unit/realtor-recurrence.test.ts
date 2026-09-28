import { describe, expect, it } from 'vitest';
import type { DueSpec } from '@/lib/realtor-workspace/contracts';
import { expandOccurrences, reminderInstant } from '@/lib/realtor-workspace/recurrence';

const monthlyOn31st: DueSpec = {
  anchorDate: '2026-01-31', localTime: '09:00', timeZone: 'America/Chicago',
  recurrence: { frequency: 'monthly', interval: 1 }, endsOn: null, reminderOffsetsDays: [1],
};

describe('realtor planner recurrence', () => {
  it('clamps short months without drifting the original day-of-month anchor', () => {
    expect(expandOccurrences(monthlyOn31st, '2026-01-01', '2026-04-30').occurrences.map((item) => item.occurrenceKeyDate))
      .toEqual(['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30']);
  });

  it('continues bounded projections from the next occurrence without duplicates', () => {
    const first = expandOccurrences(monthlyOn31st, '2026-01-01', '2026-06-30', 2);
    expect(first.occurrences.map((item) => item.occurrenceKeyDate)).toEqual(['2026-01-31', '2026-02-28']);
    expect(first).toMatchObject({ hasMore: true, nextDate: '2026-03-31' });
    const next = expandOccurrences(monthlyOn31st, first.nextDate!, '2026-06-30', 2);
    expect(next.occurrences.map((item) => item.occurrenceKeyDate)).toEqual(['2026-03-31', '2026-04-30']);
  });

  it('uses local calendar days for reminders across the spring DST transition', () => {
    expect(reminderInstant('2026-03-09', 1, '09:00', 'America/Chicago')).toBe('2026-03-08T14:00:00.000Z');
  });

  it('keeps a reminder at the same local hour after the fall DST transition', () => {
    expect(reminderInstant('2026-11-02', 1, '09:00', 'America/Chicago')).toBe('2026-11-01T15:00:00.000Z');
  });
});
