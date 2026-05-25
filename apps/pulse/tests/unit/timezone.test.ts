import { describe, it, expect } from 'vitest';
import { getChicagoToday, chicagoDateTime, getChicagoWeekRange } from '../../lib/core/timezone';

describe('Timezone Hardening Helper Library', () => {
  describe('getChicagoToday', () => {
    it('should return a valid Date object representing current time in Chicago', () => {
      const today = getChicagoToday();
      expect(today).toBeInstanceOf(Date);
      expect(isNaN(today.getTime())).toBe(false);
    });
  });

  describe('chicagoDateTime', () => {
    it('should resolve local hour and minute correctly during Daylight Saving Time (UTC-5)', () => {
      // May 24, 2026 is in Daylight Saving Time
      // 12:00 PM in Chicago should correspond to 17:00 UTC (12 + 5 = 17)
      const dstDate = chicagoDateTime('2026-05-24', 12, 0);
      expect(dstDate.getUTCHours()).toBe(17);
      expect(dstDate.getUTCMinutes()).toBe(0);
      expect(dstDate.toISOString()).toBe('2026-05-24T17:00:00.000Z');
    });

    it('should resolve local hour and minute correctly during Standard Time (UTC-6)', () => {
      // December 25, 2026 is in Standard Time
      // 12:00 PM in Chicago should correspond to 18:00 UTC (12 + 6 = 18)
      const stdDate = chicagoDateTime('2026-12-25', 12, 0);
      expect(stdDate.getUTCHours()).toBe(18);
      expect(stdDate.getUTCMinutes()).toBe(0);
      expect(stdDate.toISOString()).toBe('2026-12-25T18:00:00.000Z');
    });

    it('should accept Date objects and resolve correctly', () => {
      const baseDate = new Date('2026-05-24T10:00:00.000Z');
      const resolved = chicagoDateTime(baseDate, 8, 30);
      // Under DST, 8:30 AM is 13:30 UTC
      expect(resolved.toISOString()).toBe('2026-05-24T13:30:00.000Z');
    });
  });

  describe('getChicagoWeekRange', () => {
    it('should return valid start and end dates', () => {
      const range = getChicagoWeekRange(0);
      expect(range.start).toBeInstanceOf(Date);
      expect(range.end).toBeInstanceOf(Date);
      expect(range.start.getTime()).toBeLessThan(range.end.getTime());
    });

    it('should align boundaries to Monday 00:00:00 and Sunday 23:59:59.999 in Chicago time', () => {
      const range = getChicagoWeekRange(0);
      
      // Convert start and end back to Chicago string parts to verify
      const startChicagoStr = range.start.toLocaleString('en-US', { timeZone: 'America/Chicago' });
      const endChicagoStr = range.end.toLocaleString('en-US', { timeZone: 'America/Chicago' });

      expect(startChicagoStr).toContain('12:00:00 AM');
      expect(endChicagoStr).toContain('11:59:59 PM');
    });
  });
});
