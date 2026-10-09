export type SellerAcquisitionBacklogItem = {
  key: string;
  title: string;
  description: string;
  priority: number;
  estimateMinutes: number;
};

const weeklyWork: Omit<SellerAcquisitionBacklogItem, 'key'>[] = [
  {
    title: 'Record video: seller photo-day preparation',
    description: 'Draft and record a short practical seller tip. Verify any factual claims before review; do not use listing media without documented permission.',
    priority: 2,
    estimateMinutes: 45,
  },
  {
    title: 'Record video: costs to confirm before listing',
    description: 'Explain which costs a seller should verify with their own transaction professionals. Do not publish unverified local amounts or imply a guaranteed net.',
    priority: 2,
    estimateMinutes: 45,
  },
  {
    title: 'Record video: choosing relevant comparable sales',
    description: 'Create an educational short about reviewing comparable sales. Use dated, sourced examples only if approved for publication.',
    priority: 2,
    estimateMinutes: 45,
  },
  {
    title: 'Refresh one Keller / Westlake neighborhood guide',
    description: 'Choose one guide and verify current school-boundary, HOA, commute, and lifestyle statements against dated sources. Mark unknowns instead of estimating.',
    priority: 3,
    estimateMinutes: 60,
  },
  {
    title: 'Prepare open-house materials when listing-authorized',
    description: 'Only proceed for a listing with owner/broker authorization. Prepare a fact-checked property sheet and visitor follow-up capture; otherwise leave this task unstarted.',
    priority: 3,
    estimateMinutes: 45,
  },
  {
    title: 'Review and follow up with opted-in open-house inquiries',
    description: 'Review consent and contact preferences before any follow-up. Draft messages for owner review; this task does not authorize automatic sending.',
    priority: 3,
    estimateMinutes: 30,
  },
];

function isoWeekKey(date: Date): string {
  const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const weekday = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - weekday);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((utcDate.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${utcDate.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function parseLocalDate(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error('A valid local calendar date is required.');
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  if (date.toISOString().slice(0, 10) !== value) throw new Error('A valid local calendar date is required.');
  return date;
}

export function localCalendarDateInTimeZone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function sellerAcquisitionWeekForLocalDate(localDate: string) {
  const monday = parseLocalDate(localDate);
  const weekday = monday.getUTCDay() || 7;
  monday.setUTCDate(monday.getUTCDate() - weekday + 1);
  const weekKey = monday.toISOString().slice(0, 10);
  return weeklyWork.map((item) => ({
    ...item,
    key: `seller-acquisition:${weekKey}:${item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`,
  }));
}

export function sellerAcquisitionWeek(date = new Date()) {
  const weekKey = isoWeekKey(date);
  return weeklyWork.map((item) => ({ ...item, key: `seller-acquisition:${weekKey}:${item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}` }));
}
