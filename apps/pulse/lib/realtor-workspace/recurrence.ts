import { resolveLocalDateTime } from '@/lib/autonomous-workflows/schedulerPolicy';
import type { DueSpec } from './contracts';

export type PlannerOccurrenceDate = Readonly<{ occurrenceKeyDate: string; effectiveDate: string }>;

const DAY_MS = 86400000;

function parseDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return { year, month, day };
}

function dateString(year: number, month: number, day: number) {
  return String(year).padStart(4, '0') + '-' + String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0');
}

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function addDays(value: string, amount: number) {
  const { year, month, day } = parseDate(value);
  const next = new Date(Date.UTC(year, month - 1, day + amount));
  return dateString(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate());
}

function candidateOnAnchor(spec: DueSpec, index: number) {
  const anchor = parseDate(spec.anchorDate);
  switch (spec.recurrence.frequency) {
    case 'once':
      return index === 0 ? spec.anchorDate : null;
    case 'weekly':
      return addDays(spec.anchorDate, index * spec.recurrence.interval * 7);
    case 'monthly': {
      const monthIndex = anchor.month - 1 + index * spec.recurrence.interval;
      const year = anchor.year + Math.floor(monthIndex / 12);
      const month = monthIndex % 12 + 1;
      return dateString(year, month, Math.min(anchor.day, daysInMonth(year, month)));
    }
    case 'yearly': {
      const year = anchor.year + index * spec.recurrence.interval;
      return dateString(year, anchor.month, Math.min(anchor.day, daysInMonth(year, anchor.month)));
    }
  }
}

/** Expands from the original anchor, so a clamped February does not shift March. */
export function expandOccurrences(
  spec: DueSpec,
  from: string,
  through: string,
  limit = 200,
): { occurrences: PlannerOccurrenceDate[]; hasMore: boolean; nextDate: string | null } {
  if (from > through) throw new Error('Occurrence range end precedes its start.');
  if (!Number.isInteger(limit) || limit < 1 || limit > 200) throw new Error('Occurrence limit must be between 1 and 200.');
  const output: PlannerOccurrenceDate[] = [];
  const anchor = parseDate(spec.anchorDate);
  const end = spec.endsOn && spec.endsOn < through ? spec.endsOn : through;
  let index = 0;
  if (spec.recurrence.frequency === 'weekly' && from > spec.anchorDate) {
    const daysSince = Math.floor((Date.parse(from + 'T00:00:00Z') - Date.parse(spec.anchorDate + 'T00:00:00Z')) / DAY_MS);
    index = Math.max(0, Math.floor(daysSince / (7 * spec.recurrence.interval)) - 1);
  } else if (spec.recurrence.frequency === 'monthly' && from > spec.anchorDate) {
    const { year, month } = parseDate(from);
    index = Math.max(0, Math.floor(((year - anchor.year) * 12 + month - anchor.month) / spec.recurrence.interval) - 1);
  } else if (spec.recurrence.frequency === 'yearly' && from > spec.anchorDate) {
    index = Math.max(0, Math.floor((parseDate(from).year - anchor.year) / spec.recurrence.interval) - 1);
  }
  if (spec.recurrence.frequency === 'once' && spec.anchorDate < from) return { occurrences: [], hasMore: false, nextDate: null };

  const scanLimit = spec.recurrence.frequency === 'once' ? 1 : 100_000;
  for (let scanned = 0; scanned < scanLimit; scanned += 1, index += 1) {
    const occurrenceDate = candidateOnAnchor(spec, index);
    if (!occurrenceDate) break;
    if (spec.endsOn && occurrenceDate > spec.endsOn) break;
    if (occurrenceDate > end) break;
    if (occurrenceDate >= from) {
      if (output.length === limit) return { occurrences: output, hasMore: true, nextDate: occurrenceDate };
      output.push({ occurrenceKeyDate: occurrenceDate, effectiveDate: occurrenceDate });
    }
    if (spec.recurrence.frequency === 'once') break;
  }
  return { occurrences: output, hasMore: false, nextDate: null };
}

export function reminderInstant(occurrenceDate: string, daysBefore: number, localTime: string | null, timeZone: string) {
  if (!Number.isInteger(daysBefore) || daysBefore < 0 || daysBefore > 365) throw new Error('Reminder offset must be between 0 and 365 calendar days.');
  const reminderDate = addDays(occurrenceDate, -daysBefore);
  return resolveLocalDateTime(reminderDate, localTime || '09:00', timeZone);
}

export function buildOccurrenceKey(itemId: string, originalLocalDate: string) {
  return itemId.toLowerCase() + ':' + originalLocalDate;
}
