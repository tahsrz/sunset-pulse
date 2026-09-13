import { describe, expect, it } from 'vitest';
import { advanceSchedule, cadenceMilliseconds, isValidTimeZone, MAX_WORKFLOW_ATTEMPTS, nextOccurrenceAfter } from '@/lib/autonomous-workflows/schedulerPolicy';

describe('shared scheduler policy', () => {
  it('keeps one retry limit and supported cadence intervals', () => {
    expect(MAX_WORKFLOW_ATTEMPTS).toBe(3);
    expect(cadenceMilliseconds('daily')).toBe(24 * 60 * 60 * 1000);
    expect(cadenceMilliseconds('weekly')).toBe(7 * 24 * 60 * 60 * 1000);
  });
  it('advances from the stored occurrence without drifting', () => {
    expect(advanceSchedule('2026-09-12T13:00:00.000Z', 'daily')).toBe('2026-09-13T13:00:00.000Z');
  });
  it('advances daily in the configured timezone across daylight saving time', () => {
    expect(advanceSchedule('2026-03-07T15:00:00.000Z', 'daily', 'America/Chicago')).toBe('2026-03-08T14:00:00.000Z');
  });
  it('advances hourly schedules by one hour', () => {
    expect(advanceSchedule('2026-11-01T05:00:00.000Z', 'hourly', 'America/Chicago')).toBe('2026-11-01T06:00:00.000Z');
  });
  it('advances weekly schedules across a local week boundary', () => {
    expect(advanceSchedule('2026-09-06T14:00:00.000Z', 'weekly', 'America/Chicago', undefined, undefined, 7)).toBe('2026-09-13T14:00:00.000Z');
  });
  it('advances weekly schedules to the configured weekday', () => {
    expect(advanceSchedule('2026-09-06T14:00:00.000Z', 'weekly', 'America/Chicago', 8, 0, 1)).toBe('2026-09-07T13:00:00.000Z');
  });
  it('rejects invalid timezone identifiers', () => {
    expect(() => advanceSchedule('2026-09-12T13:00:00.000Z', 'daily', 'Invalid/Timezone')).toThrow();
  });
  it('validates timezone identifiers before persistence', () => {
    expect(isValidTimeZone('America/Chicago')).toBe(true);
    expect(isValidTimeZone('Invalid/Timezone')).toBe(false);
  });
  it('starts a weekly schedule at the next configured local occurrence', () => {
    expect(nextOccurrenceAfter(new Date('2026-09-06T14:00:00.000Z'), { cadence: 'weekly', timeZone: 'America/Chicago', localHour: 8, localMinute: 0, localWeekday: 1 })).toBe('2026-09-07T13:00:00.000Z');
  });
});
