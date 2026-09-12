export const MAX_WORKFLOW_ATTEMPTS = 3;
export type WorkflowCadence = 'hourly' | 'daily' | 'weekly';

export function isValidTimeZone(timeZone: string) {
  try { new Intl.DateTimeFormat('en-US', { timeZone }).format(); return true; } catch { return false; }
}

export function cadenceMilliseconds(cadence: WorkflowCadence) {
  if (cadence === 'daily') return 24 * 60 * 60 * 1000;
  if (cadence === 'weekly') return 7 * 24 * 60 * 60 * 1000;
  return 60 * 60 * 1000;
}

export function advanceSchedule(nextRunAt: string, cadence: WorkflowCadence, timeZone = 'UTC', localHour?: number, localMinute?: number, localWeekday = 1) {
  const next = Date.parse(nextRunAt);
  if (!Number.isFinite(next)) throw new Error('Schedule next_run_at must be a valid ISO timestamp.');
  if (cadence === 'hourly') return new Date(next + cadenceMilliseconds(cadence)).toISOString();
  if (timeZone === 'UTC') return new Date(next + cadenceMilliseconds(cadence)).toISOString();
  const parts = localParts(new Date(next), timeZone);
  if (localHour !== undefined) parts.hour = localHour;
  if (localMinute !== undefined) parts.minute = localMinute;
  const currentWeekday = new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay() || 7;
  const weeklyDelta = ((localWeekday - currentWeekday + 7) % 7) || 7;
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + (cadence === 'weekly' ? weeklyDelta : 1), parts.hour, parts.minute, parts.second));
  return toUtcIso(date, timeZone);
}

function localParts(value: Date, timeZone: string) {
  const values = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(value);
  const get = (type: string) => Number(values.find((part) => part.type === type)?.value);
  return { year: get('year'), month: get('month'), day: get('day'), hour: get('hour'), minute: get('minute'), second: get('second') };
}

function toUtcIso(localDate: Date, timeZone: string) {
  let guess = localDate.getTime();
  for (let index = 0; index < 3; index += 1) {
    const actual = localParts(new Date(guess), timeZone);
    const actualAsUtc = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute, actual.second);
    guess += localDate.getTime() - actualAsUtc;
  }
  return new Date(guess).toISOString();
}
