export type GoalMetric = 'net_income' | 'closings' | 'weekly_reviews';
export type ProgressGoal = { id: string; metric: GoalMetric; target: number; year: number };
export type ProgressHistoryEvent = {
  id: string; occurredAt: string; title: string; explanation: string;
  localWeekKey: string | null; timeZone: string | null; effectiveDate: string | null; toStatus: string | null; metric: string | null;
};
export type ProgressSummary = {
  recordedNetCents?: string | number;
  closingCount?: string | number;
  progressHistoryAvailable?: boolean;
  progressHistory?: ProgressHistoryEvent[];
};
export type WeeklyReviewEvidence = {
  version: 1 | 2;
  localWeekKey: string;
  timeZone: string;
  reviewedUpcomingDates: true;
  reviewedMissingExpenses: true;
  priority: string;
  reviewedSellerOutcomes?: true;
  chosenNextAction?: string;
  friction?: string | null;
};
export type GoalProgress = ProgressGoal & {
  actual: number;
  rawPercent: number;
  visualPercent: number;
  reached: boolean;
};
export type ProgressMilestone = { id: string; title: string; detail: string; earned: boolean };

function validDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}

export function readWeeklyReviewEvidence(details: unknown): WeeklyReviewEvidence | null {
  if (!details || typeof details !== 'object' || Array.isArray(details)) return null;
  const root = details as Record<string, unknown>;
  if (Object.keys(root).length !== 1 || !root.weeklyReview || typeof root.weeklyReview !== 'object' || Array.isArray(root.weeklyReview)) return null;
  const review = root.weeklyReview as Record<string, unknown>;
  const v1 = ['version', 'reviewedUpcomingDates', 'reviewedMissingExpenses', 'priority', 'timeZone', 'localWeekKey'];
  const v2 = [...v1, 'reviewedSellerOutcomes', 'chosenNextAction', 'friction'];
  const allowed = review.version === 2 ? v2 : v1;
  if (Object.keys(review).some((key) => !allowed.includes(key)) || allowed.some((key) => !(key in review))) return null;
  if ((review.version !== 1 && review.version !== 2) || review.reviewedUpcomingDates !== true || review.reviewedMissingExpenses !== true
    || typeof review.priority !== 'string' || review.priority.trim().length < 1 || review.priority.trim().length > 200
    || typeof review.timeZone !== 'string' || review.timeZone.length > 80 || !validDate(review.localWeekKey)) return null;
  if (review.version === 2 && (review.reviewedSellerOutcomes !== true
    || typeof review.chosenNextAction !== 'string' || review.chosenNextAction.trim().length < 1 || review.chosenNextAction.trim().length > 200
    || !(review.friction === null || (typeof review.friction === 'string' && review.friction.trim().length <= 500)))) return null;
  try { new Intl.DateTimeFormat('en-US', { timeZone: review.timeZone }).format(); } catch { return null; }
  const weekday = new Date(review.localWeekKey + 'T00:00:00Z').getUTCDay();
  if (weekday !== 1) return null;
  return {
    version: review.version,
    localWeekKey: review.localWeekKey,
    timeZone: review.timeZone,
    reviewedUpcomingDates: true,
    reviewedMissingExpenses: true,
    priority: review.priority.trim(),
    ...(review.version === 2 ? {
      reviewedSellerOutcomes: true as const,
      chosenNextAction: (review.chosenNextAction as string).trim(),
      friction: typeof review.friction === 'string' ? review.friction.trim() : null,
    } : {}),
  };
}

export function localDateInZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)?.value || '';
  return value('year') + '-' + value('month') + '-' + value('day');
}

export function localDateTimeInZone(date: Date, timeZone: string, time?: string) {
  const localDate = localDateInZone(date, timeZone);
  const localTime = time || new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(date);
  return `${localDate}T${localTime}`;
}

export function possibleUtcInstantsForLocalDateTime(value: string, timeZone: string) {
  const match = /^(\d{4}-\d{2}-\d{2})T([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match || !validDate(match[1])) throw new Error('Choose a valid local date and time.');
  const [year, month, day] = match[1].split('-').map(Number);
  const desired = Date.UTC(year, month - 1, day, Number(match[2]), Number(match[3]));
  const format = new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  });
  const offsets = new Set<number>();
  for (let hour = -36; hour <= 36; hour += 3) {
    const sample = desired + hour * 60 * 60 * 1000;
    const parts = Object.fromEntries(format.formatToParts(new Date(sample)).map((part) => [part.type, part.value]));
    const formattedAsUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute));
    offsets.add(formattedAsUtc - sample);
  }
  return [...offsets].map((offset) => new Date(desired - offset))
    .filter((candidate) => localDateTimeInZone(candidate, timeZone) === value)
    .sort((left, right) => left.getTime() - right.getTime());
}

export function localDateTimeToIso(value: string, timeZone: string) {
  const candidates = possibleUtcInstantsForLocalDateTime(value, timeZone);
  if (!candidates.length) throw new Error('That local time does not exist because of a daylight-saving time change. Choose another time.');
  return candidates[0].toISOString();
}

export function mondayOfLocalDate(localDate: string) {
  const [year, month, day] = localDate.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const daysSinceMonday = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - daysSinceMonday);
  return date.toISOString().slice(0, 10);
}

function countRecentReviewWeeks(weeks: string[], timeZone: string, now: Date) {
  const currentMonday = mondayOfLocalDate(localDateInZone(now, timeZone));
  const upper = new Date(currentMonday + 'T00:00:00Z');
  const lower = new Date(upper);
  lower.setUTCDate(lower.getUTCDate() - 7 * 7);
  const lowerKey = lower.toISOString().slice(0, 10);
  return new Set(weeks.filter((week) => week >= lowerKey && week <= currentMonday)).size;
}

export function deriveGoalProgress(
  summary: ProgressSummary,
  goals: ProgressGoal[],
  completedReviews: Array<Pick<WeeklyReviewEvidence, 'localWeekKey'>>,
  timeZone: string,
  now = new Date(),
) {
  const reviewWeeks = [...new Set(completedReviews.map((review) => review.localWeekKey))].sort();
  const progress: GoalProgress[] = goals.map((goal) => {
    const actual = goal.metric === 'net_income'
      ? Number(BigInt(String(summary.recordedNetCents || '0')))
      : goal.metric === 'closings' ? Number(summary.closingCount || 0)
        : reviewWeeks.filter((week) => Number(week.slice(0, 4)) === goal.year).length;
    const rawPercent = goal.target > 0 ? (actual / goal.target) * 100 : 0;
    return { ...goal, actual, rawPercent, visualPercent: Math.max(0, Math.min(100, rawPercent)), reached: actual >= goal.target };
  });

  const netGoal = goals.find((goal) => goal.metric === 'net_income');
  const netActual = Number(BigInt(String(summary.recordedNetCents || '0')));
  const netPercent = netGoal && netGoal.target > 0 ? (netActual / netGoal.target) * 100 : 0;
  const recentReviewCount = countRecentReviewWeeks(reviewWeeks, timeZone, now);
  const milestones: ProgressMilestone[] = [
    { id: 'first-closing', title: 'First recorded closing', detail: 'Earned from a distinct, active commission closing reference.', earned: Number(summary.closingCount || 0) > 0 },
    { id: 'first-weekly-review', title: 'First weekly business review', detail: 'Earned by completing the review checklist.', earned: reviewWeeks.length > 0 },
    { id: 'four-reviews-eight-weeks', title: 'Four reviews in eight weeks', detail: 'Four distinct local weeks with a completed review in the rolling eight-week window.', earned: recentReviewCount >= 4 },
    ...([25, 50, 75, 100] as const).map((threshold) => ({
      id: 'annual-net-' + threshold,
      title: threshold + '% of annual net goal',
      detail: netGoal ? 'Based on recorded net income against your ' + netGoal.year + ' goal.' : 'Set an annual recorded-net goal to enable this milestone.',
      earned: Boolean(netGoal && netPercent >= threshold),
    })),
  ];
  return { progress, milestones, reviewWeeks, recentReviewCount };
}
