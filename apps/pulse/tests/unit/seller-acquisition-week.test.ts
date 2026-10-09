import { describe, expect, it } from 'vitest';
import { localCalendarDateInTimeZone, sellerAcquisitionWeek, sellerAcquisitionWeekForLocalDate } from '@/lib/marketing/sellerAcquisitionWeek';

describe('seller acquisition weekly backlog preset', () => {
  it('creates six scoped, human-owned items with stable ISO-week provenance', () => {
    const week = sellerAcquisitionWeek(new Date('2026-10-05T16:00:00.000Z'));
    expect(week).toHaveLength(6);
    expect(week.map((item) => item.key)).toEqual(sellerAcquisitionWeek(new Date('2026-10-09T16:00:00.000Z')).map((item) => item.key));
    expect(week.every((item) => item.key.startsWith('seller-acquisition:2026-W41:'))).toBe(true);
    expect(week.map((item) => item.title)).toEqual(expect.arrayContaining([
      expect.stringContaining('Record video'),
      expect.stringContaining('neighborhood guide'),
      expect.stringContaining('open-house'),
      expect.stringContaining('opted-in'),
    ]));
  });

  it('changes provenance at the ISO week boundary', () => {
    const before = sellerAcquisitionWeek(new Date('2026-10-04T23:59:00.000Z'))[0].key;
    const after = sellerAcquisitionWeek(new Date('2026-10-05T00:01:00.000Z'))[0].key;
    expect(before).toContain('2026-W40');
    expect(after).toContain('2026-W41');
  });

  it('uses the seller-local Monday across a Sunday and Monday boundary', () => {
    expect(sellerAcquisitionWeekForLocalDate('2026-10-04')[0].key).toContain('2026-09-28');
    expect(sellerAcquisitionWeekForLocalDate('2026-10-05')[0].key).toContain('2026-10-05');
  });

  it('rejects impossible local dates and keeps a DST week keyed to its calendar Monday', () => {
    expect(() => sellerAcquisitionWeekForLocalDate('2026-02-30')).toThrow('valid local calendar date');
    expect(sellerAcquisitionWeekForLocalDate('2026-03-08')[0].key).toContain('2026-03-02');
    expect(sellerAcquisitionWeekForLocalDate('2026-11-01')[0].key).toContain('2026-10-26');
  });

  it('derives the calendar date from the configured timezone at midnight boundaries', () => {
    expect(localCalendarDateInTimeZone(new Date('2026-10-05T04:30:00.000Z'), 'America/Chicago')).toBe('2026-10-04');
    expect(localCalendarDateInTimeZone(new Date('2026-10-05T06:30:00.000Z'), 'America/Chicago')).toBe('2026-10-05');
  });
});
