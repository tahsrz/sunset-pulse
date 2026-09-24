import { z } from 'zod';

export const MAX_WORKFLOW_ATTEMPTS = 3;
export type WorkflowCadence = 'hourly' | 'daily' | 'weekly';

export const scheduleSpecSchema = z.object({
  cadence: z.enum(['hourly', 'daily', 'weekly']),
  timeZone: z.string().trim().min(1).max(80).refine(isValidTimeZone, 'Invalid timezone identifier.'),
  localHour: z.number().int().min(0).max(23).default(8),
  localMinute: z.number().int().min(0).max(59).default(0),
  localWeekday: z.number().int().min(1).max(7).default(1),
});

export type ScheduleSpec = z.output<typeof scheduleSpecSchema>;
export type ScheduleSpecInput = z.input<typeof scheduleSpecSchema>;

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const OFFSET_SCAN_RADIUS_MS = 3 * DAY_MS;
const OFFSET_SCAN_STEP_MS = 30 * MINUTE_MS;

export function isValidTimeZone(timeZone: string) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format();
    return true;
  } catch {
    return false;
  }
}

export function normalizeScheduleSpec(input: ScheduleSpecInput): ScheduleSpec {
  return scheduleSpecSchema.parse(input);
}

export function cadenceMilliseconds(cadence: WorkflowCadence) {
  if (cadence === 'daily') return DAY_MS;
  if (cadence === 'weekly') return 7 * DAY_MS;
  return HOUR_MS;
}

export function nextOccurrenceAfter(now: Date, input: ScheduleSpecInput) {
  if (!Number.isFinite(now.getTime())) throw new Error('Schedule clock must be valid.');
  const spec = normalizeScheduleSpec(input);

  if (spec.cadence === 'hourly') {
    return new Date(now.getTime() + HOUR_MS).toISOString();
  }

  const current = localParts(now, spec.timeZone);
  const currentWeekday = isoWeekday(current);
  const dayDelta = spec.cadence === 'weekly'
    ? (spec.localWeekday - currentWeekday + 7) % 7
    : 0;
  const wallClock: CalendarParts = {
    ...current,
    day: current.day + dayDelta,
    hour: spec.localHour,
    minute: spec.localMinute,
    second: 0,
  };
  let candidate = calendarToUtcIso(wallClock, spec.timeZone);

  if (Date.parse(candidate) <= now.getTime()) {
    candidate = advanceSchedule(candidate, spec);
  }

  return candidate;
}

export function advanceSchedule(nextRunAt: string, spec: ScheduleSpec): string;
export function advanceSchedule(
  nextRunAt: string,
  cadence: WorkflowCadence,
  timeZone?: string,
  localHour?: number,
  localMinute?: number,
  localWeekday?: number,
): string;
export function advanceSchedule(
  nextRunAt: string,
  specOrCadence: ScheduleSpec | WorkflowCadence,
  timeZone = 'UTC',
  localHour?: number,
  localMinute?: number,
  localWeekday = 1,
) {
  const next = Date.parse(nextRunAt);
  if (!Number.isFinite(next)) throw new Error('Schedule next_run_at must be a valid ISO timestamp.');

  const spec = typeof specOrCadence === 'string'
    ? normalizeLegacySpec(new Date(next), specOrCadence, timeZone, localHour, localMinute, localWeekday)
    : normalizeScheduleSpec(specOrCadence);

  if (spec.cadence === 'hourly') {
    return new Date(next + HOUR_MS).toISOString();
  }

  const current = localParts(new Date(next), spec.timeZone);
  const dayDelta = spec.cadence === 'weekly'
    ? (spec.localWeekday - isoWeekday(current) + 7) % 7 || 7
    : 1;
  return calendarToUtcIso({
    ...current,
    day: current.day + dayDelta,
    hour: spec.localHour,
    minute: spec.localMinute,
    second: 0,
  }, spec.timeZone);
}

function normalizeLegacySpec(
  occurrence: Date,
  cadence: WorkflowCadence,
  timeZone: string,
  localHour: number | undefined,
  localMinute: number | undefined,
  localWeekday: number,
): ScheduleSpec {
  const current = localParts(occurrence, timeZone);
  return normalizeScheduleSpec({
    cadence,
    timeZone,
    localHour: localHour ?? current.hour,
    localMinute: localMinute ?? current.minute,
    localWeekday,
  });
}

type CalendarParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function localParts(value: Date, timeZone: string): CalendarParts {
  const values = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(value);
  const get = (type: string) => Number(values.find((part) => part.type === type)?.value);
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
    second: get('second'),
  };
}

function isoWeekday(parts: CalendarParts) {
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay() || 7;
}

function calendarDate(parts: CalendarParts) {
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
}

function calendarToUtcIso(parts: CalendarParts, timeZone: string) {
  const localAsUtc = calendarDate(parts);
  const candidates = possibleUtcInstants(localAsUtc, utcCalendarParts(localAsUtc), timeZone);

  if (candidates.length > 0) {
    return new Date(Math.min(...candidates)).toISOString();
  }

  const beforeOffset = timezoneOffsetAt(localAsUtc - OFFSET_SCAN_RADIUS_MS, timeZone);
  const afterOffset = timezoneOffsetAt(localAsUtc + OFFSET_SCAN_RADIUS_MS, timeZone);
  const gap = beforeOffset - afterOffset;

  if (gap > 0) {
    const shifted = localAsUtc + gap;
    const shiftedCandidates = possibleUtcInstants(shifted, utcCalendarParts(shifted), timeZone);
    if (shiftedCandidates.length > 0) {
      return new Date(Math.min(...shiftedCandidates)).toISOString();
    }
  }

  throw new Error(`Unable to resolve local schedule time in ${timeZone}.`);
}

function utcCalendarParts(value: number): CalendarParts {
  const date = new Date(value);
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: date.getUTCHours(),
    minute: date.getUTCMinutes(),
    second: date.getUTCSeconds(),
  };
}

function possibleUtcInstants(localAsUtc: number, expected: CalendarParts, timeZone: string) {
  const offsets = new Set<number>();
  for (let instant = localAsUtc - OFFSET_SCAN_RADIUS_MS; instant <= localAsUtc + OFFSET_SCAN_RADIUS_MS; instant += OFFSET_SCAN_STEP_MS) {
    offsets.add(timezoneOffsetAt(instant, timeZone));
  }

  return [...offsets]
    .map((offset) => localAsUtc + offset)
    .filter((instant) => sameCalendarParts(localParts(new Date(instant), timeZone), expected));
}

function timezoneOffsetAt(instant: number, timeZone: string) {
  const parts = localParts(new Date(instant), timeZone);
  return instant - calendarDate(parts);
}

function sameCalendarParts(left: CalendarParts, right: CalendarParts) {
  return left.year === right.year
    && left.month === right.month
    && left.day === right.day
    && left.hour === right.hour
    && left.minute === right.minute
    && left.second === right.second;
}
