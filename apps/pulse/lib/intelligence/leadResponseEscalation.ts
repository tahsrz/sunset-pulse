export type LeadResponseOperatingHours = {
  timeZone: string;
  weekdays: number[];
  startHour: number;
  endHour: number;
  thresholdMinutes: number;
};

export type LeadResponseEscalationCandidate = {
  deliveredAt: string;
  contactAttemptedAt?: string | null;
  leadStatus?: string | null;
};

const RESOLVED_STATUSES = new Set(['archived', 'closed']);

export function leadResponseOperatingHoursFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): LeadResponseOperatingHours {
  return {
    timeZone: env.AGENT_ALERT_OPERATING_TIME_ZONE?.trim() || 'America/Chicago',
    weekdays: parseWeekdays(env.AGENT_ALERT_OPERATING_WEEKDAYS),
    startHour: boundedInteger(env.AGENT_ALERT_OPERATING_START_HOUR, 8, 0, 23),
    endHour: boundedInteger(env.AGENT_ALERT_OPERATING_END_HOUR, 18, 1, 24),
    thresholdMinutes: boundedInteger(env.AGENT_ALERT_CONTACT_THRESHOLD_MINUTES, 10, 1, 240),
  };
}

export function shouldEscalateLeadResponse(
  candidate: LeadResponseEscalationCandidate,
  now: Date,
  policy: LeadResponseOperatingHours,
) {
  if (candidate.contactAttemptedAt || RESOLVED_STATUSES.has((candidate.leadStatus || '').toLowerCase())) {
    return false;
  }
  const deliveredAt = new Date(candidate.deliveredAt);
  if (!Number.isFinite(deliveredAt.getTime()) || deliveredAt >= now) return false;
  return operatingMinutesBetween(deliveredAt, now, policy) >= policy.thresholdMinutes;
}

export function operatingMinutesBetween(
  start: Date,
  end: Date,
  policy: LeadResponseOperatingHours,
) {
  if (start >= end || policy.startHour >= policy.endHour) return 0;
  let minutes = 0;
  const cursor = new Date(Math.floor(start.getTime() / 60_000) * 60_000);
  const endMs = end.getTime();
  while (cursor.getTime() < endMs && minutes < policy.thresholdMinutes) {
    const sample = new Date(cursor.getTime() + 30_000);
    const local = localTimeParts(sample, policy.timeZone);
    if (
      policy.weekdays.includes(local.weekday)
      && local.hour >= policy.startHour
      && local.hour < policy.endHour
    ) {
      minutes += 1;
    }
    cursor.setUTCMinutes(cursor.getUTCMinutes() + 1);
  }
  return minutes;
}

function localTimeParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    hour: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value || '';
  return {
    weekday: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(value('weekday')),
    hour: Number(value('hour')),
  };
}

function parseWeekdays(value?: string) {
  if (!value?.trim()) return [1, 2, 3, 4, 5];
  const parsed = value.split(',').map(Number).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6);
  return parsed.length ? [...new Set(parsed)] : [1, 2, 3, 4, 5];
}

function boundedInteger(value: string | undefined, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= min && parsed <= max ? parsed : fallback;
}
