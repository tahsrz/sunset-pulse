import 'server-only';

import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { requirePersonalRealtorWorkspace } from './access.server';
import { commissionInputSchema, dueSpecSchema, expenseInputSchema, expectedIncomeInputSchema, goalInputSchema, plannerItemInputSchema, realtorDateSchema, recurrenceSchema } from './contracts';
import { expandOccurrences } from './recurrence';
import { listGoals, listTodayOccurrences, readBusinessSummary } from './store.server';
import { RealtorWorkspaceError } from './access.server';
import { listShortlistEntries } from '@/lib/property-sprints/shortlist.server';

export const agendaInputSchema = z.object({ includeReminders: z.boolean().default(true) }).strict();
export const summaryInputSchema = z.object({ year: z.number().int().min(2000).max(2200).optional() }).strict();
export const plannerProposalInputSchema = z.object({
  propertyId: z.string().uuid().nullable().optional(),
  kind: z.enum(['bill', 'professional_deadline', 'appointment', 'follow_up', 'task', 'weekly_review']).optional(),
  title: z.string().trim().min(1).max(160).optional(),
  dueDate: realtorDateSchema.optional(),
  localTime: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/).nullable().optional(),
  recurrence: recurrenceSchema.optional(),
  endsOn: realtorDateSchema.nullable().optional(),
  reminderOffsetsDays: z.array(z.number().int().min(0).max(365)).max(3)
    .refine((values) => new Set(values).size === values.length).optional(),
  expectedAmountCents: z.number().int().positive().max(1_000_000_000_000).nullable().optional(),
  notes: z.string().max(2000).optional(),
}).strict();
export const financialProposalInputSchema = z.object({
  kind: z.enum(['commission', 'expense', 'expected_income']).optional(),
  mode: z.enum(['gross', 'net_deposit']).optional(),
  amountCents: z.number().int().positive().max(1_000_000_000_000).optional(),
  date: realtorDateSchema.optional(),
  deductions: z.array(z.object({ kind: z.enum(['broker_split', 'transaction_fee', 'other_withheld']), label: z.string().trim().min(1).max(120), amountCents: z.number().int().positive().max(1_000_000_000_000) }).strict()).max(20).optional(),
  confirmNoDeductions: z.boolean().optional(),
  category: z.enum(['broker_dues', 'mls', 'association', 'education', 'license', 'insurance', 'marketing', 'software', 'other']).optional(),
  payee: z.string().max(160).optional(),
  note: z.string().max(1000).optional(),
  label: z.string().trim().min(1).max(160).optional(),
  closingReference: z.string().trim().min(1).max(120).nullable().optional(),
  memo: z.string().max(1000).optional(),
}).strict();
export const goalProposalInputSchema = z.object({
  metric: z.enum(['net_income', 'closings', 'weekly_reviews']).optional(),
  target: z.number().int().positive().max(1_000_000_000_000).optional(),
  year: z.number().int().min(2000).max(2200).optional(),
}).strict();

function localYear(timeZone: string) {
  return Number(new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric' }).format(new Date()));
}

function nextCalendarDate(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + 365)).toISOString().slice(0, 10);
}

export async function readPersonalAgenda(actorId: string, rawInput: unknown = {}) {
  const input = agendaInputSchema.parse(rawInput);
  const { workspaceId, preferences } = await requirePersonalRealtorWorkspace(actorId);
  const agenda = await listTodayOccurrences(actorId, workspaceId, preferences.time_zone);
  return {
    kind: 'personal_agenda' as const,
    timeZone: preferences.time_zone,
    asOfDate: agenda.asOfDate,
    overdue: agenda.overdue.map(({ id, title_snapshot, effective_date, kind_snapshot, property_label }) => ({ id, title: title_snapshot, dueDate: effective_date, kind: kind_snapshot, property: property_label })),
    upcoming: agenda.upcoming.map(({ id, title_snapshot, effective_date, effective_time, kind_snapshot, property_label }) => ({ id, title: title_snapshot, dueDate: effective_date, localTime: effective_time, kind: kind_snapshot, property: property_label })),
    reminders: input.includeReminders ? agenda.reminders.map(({ id, scheduled_at, occurrence }) => ({ id, scheduledAt: scheduled_at, title: occurrence?.title_snapshot || 'Planner reminder', dueDate: occurrence?.effective_date || null, property: occurrence?.property_label || null })) : [],
  };
}

export async function readPersonalBusinessSummary(actorId: string, rawInput: unknown = {}) {
  const input = summaryInputSchema.parse(rawInput);
  const { workspaceId, preferences } = await requirePersonalRealtorWorkspace(actorId);
  const year = input.year ?? localYear(preferences.time_zone);
  const [summary, goals] = await Promise.all([
    readBusinessSummary(actorId, workspaceId, year),
    listGoals(actorId, workspaceId, year),
  ]);
  return {
    kind: 'personal_business_summary' as const,
    year,
    currency: 'USD' as const,
    recordedNetCents: summary.recordedNetCents,
    receivedCents: summary.receivedCents,
    paidExpensesCents: summary.paidExpensesCents,
    pendingIncomeCents: summary.pendingIncomeCents,
    knownGrossCents: summary.knownGrossCents,
    knownWithheldCents: summary.knownWithheldCents,
    grossComplete: summary.grossComplete,
    closingCount: summary.closingCount,
    completedWeeklyReviews: summary.completedWeeklyReviews,
    recordsStartDate: summary.recordsStartDate,
    goals: goals.map(({ metric, target }) => ({ metric, target })),
    href: '/business',
    note: 'Private manual records only; recorded totals are before taxes. Pending income is not received income.',
  };
}

export async function preparePlannerProposal(actorId: string, rawInput: unknown) {
  const input = plannerProposalInputSchema.parse(rawInput);
  const { preferences } = await requirePersonalRealtorWorkspace(actorId);
  if (input.propertyId) {
    const properties = await listShortlistEntries(actorId);
    if (!properties.some((property) => property.id === input.propertyId && property.status === 'active')) throw new RealtorWorkspaceError('INVALID');
  }
  const missingFields = [
    ...(!input.kind ? ['kind'] : []),
    ...(!input.title ? ['title'] : []),
    ...(!input.dueDate ? ['first due date'] : []),
    ...(!input.recurrence ? ['recurrence'] : []),
  ];
  const draft = {
    kind: input.kind ?? null,
    title: input.title ?? '',
    notes: input.notes ?? '',
    expectedAmountCents: input.kind === 'bill' ? input.expectedAmountCents ?? null : null,
    property: input.propertyId ? { propertyId: input.propertyId } : null,
    due: input.dueDate && input.recurrence ? {
      anchorDate: input.dueDate,
      localTime: input.localTime ?? null,
      timeZone: preferences.time_zone,
      recurrence: input.recurrence,
      endsOn: input.endsOn ?? null,
      reminderOffsetsDays: input.reminderOffsetsDays ?? [],
    } : null,
  };
  let preview: { nextThreeDueDates: string[]; timeZone: string } | null = null;
  let apiPayload: Record<string, unknown> | null = null;
  if (missingFields.length === 0 && draft.due) {
    const parsedItem = plannerItemInputSchema.parse({ ...draft, requestKey: randomUUID() });
    const due = dueSpecSchema.parse(parsedItem.due);
    preview = {
      nextThreeDueDates: expandOccurrences(due, due.anchorDate, nextCalendarDate(due.anchorDate), 3).occurrences.map((item) => item.effectiveDate),
      timeZone: preferences.time_zone,
    };
    const { requestKey: _requestKey, ...item } = parsedItem;
    apiPayload = { itemId: null, expectedRevision: null, item };
  }
  return {
    kind: 'planner_proposal' as const,
    proposalId: randomUUID(),
    editableFields: draft,
    missingFields,
    preview,
    targetRevision: null,
    intendedApiAction: 'POST /api/realtor/planner',
    apiPayload,
    confirmation: 'This is a draft only. No planner item or reminder has been saved.',
  };
}

export async function prepareFinancialProposal(actorId: string, rawInput: unknown) {
  const input = financialProposalInputSchema.parse(rawInput);
  await requirePersonalRealtorWorkspace(actorId);
  const missingFields: string[] = [];
  let apiPayload: Record<string, unknown> | null = null;
  let summary = 'Review the missing information before saving.';

  if (!input.kind) missingFields.push('record type');
  if (input.kind === 'commission') {
    if (!input.mode) missingFields.push('gross or deposit received');
    if (input.amountCents === undefined) missingFields.push('commission amount');
    if (!input.date) missingFields.push('received date');
    if (input.mode === 'gross' && input.deductions === undefined && input.confirmNoDeductions !== true) missingFields.push('actual deductions or explicit confirmation of zero');
    if (input.mode === 'gross' && input.deductions?.length === 0 && input.confirmNoDeductions !== true) missingFields.push('explicit confirmation of zero deductions');
    if (input.mode === 'gross' && input.confirmNoDeductions === true && input.deductions?.length) missingFields.push('choose either actual deductions or zero deductions');
    if (!missingFields.length) {
      const commission = input.mode === 'gross'
        ? commissionInputSchema.parse({ mode: 'gross', grossCents: input.amountCents, deductions: input.deductions ?? [], receivedDate: input.date, closingReference: input.closingReference ?? null, property: null, memo: input.memo ?? '', requestKey: randomUUID() })
        : commissionInputSchema.parse({ mode: 'net_deposit', depositCents: input.amountCents, receivedDate: input.date, closingReference: input.closingReference ?? null, property: null, memo: input.memo ?? '', requestKey: randomUUID() });
      const { requestKey: _requestKey, ...entry } = commission;
      apiPayload = entry;
      summary = input.mode === 'gross' ? 'Gross commission draft with user-supplied deductions.' : 'Deposit received draft; gross and deductions are not inferred.';
    }
  } else if (input.kind === 'expense') {
    if (input.amountCents === undefined) missingFields.push('amount');
    if (!input.date) missingFields.push('paid date');
    if (!input.category) missingFields.push('expense category');
    if (!missingFields.length) {
      const expense = expenseInputSchema.parse({ amountCents: input.amountCents, paidDate: input.date, category: input.category, payee: input.payee ?? '', note: input.note ?? '', occurrenceId: null, requestKey: randomUUID() });
      const { requestKey: _requestKey, ...entry } = expense;
      apiPayload = entry;
      summary = 'Paid-expense draft; it will affect net only after the user confirms it as paid.';
    }
  } else if (input.kind === 'expected_income') {
    if (input.amountCents === undefined) missingFields.push('estimated take-home amount');
    if (!input.date) missingFields.push('expected date');
    if (!input.label) missingFields.push('deal label');
    if (!missingFields.length) {
      const expected = expectedIncomeInputSchema.parse({ estimatedTakeHomeCents: input.amountCents, expectedDate: input.date, label: input.label, property: null, requestKey: randomUUID() });
      const { requestKey: _requestKey, ...entry } = expected;
      apiPayload = entry;
      summary = 'Expectation-only draft; estimated income does not count as received income.';
    }
  }
  return {
    kind: 'financial_proposal' as const,
    proposalId: randomUUID(),
    editableFields: input,
    missingFields,
    preview: { explanation: summary, amountCents: input.amountCents ?? null, date: input.date ?? null },
    targetRevision: null,
    intendedApiAction: 'POST /api/realtor/financial-records',
    apiPayload,
    confirmation: 'This is a draft only. No financial record has been saved.',
  };
}

export async function prepareGoalProposal(actorId: string, rawInput: unknown) {
  const input = goalProposalInputSchema.parse(rawInput);
  const { workspaceId, preferences } = await requirePersonalRealtorWorkspace(actorId);
  const missingFields = [
    ...(!input.metric ? ['goal metric'] : []),
    ...(!input.target ? ['goal target'] : []),
  ];
  const year = input.year ?? localYear(preferences.time_zone);
  let apiPayload: Record<string, unknown> | null = null;
  let targetRevision: number | null = null;
  let existingGoalId: string | null = null;
  if (!missingFields.length && input.metric && input.target) {
    const currentGoals = await listGoals(actorId, workspaceId, year);
    const existingGoal = currentGoals.find((goal) => goal.metric === input.metric);
    targetRevision = existingGoal?.revision ?? null;
    existingGoalId = existingGoal?.id ?? null;
    const goal = goalInputSchema.parse({ metric: input.metric, year, target: input.target, expectedRevision: targetRevision, requestKey: randomUUID() });
    const { requestKey: _requestKey, ...payload } = goal;
    apiPayload = { id: existingGoalId, ...payload };
  }
  return {
    kind: 'goal_proposal' as const,
    proposalId: randomUUID(),
    editableFields: { metric: input.metric ?? null, target: input.target ?? null, year },
    missingFields,
    preview: { note: 'Goals track recorded values only; this proposal does not alter any records.' },
    targetRevision,
    intendedApiAction: 'POST /api/realtor/goals',
    apiPayload,
    confirmation: 'This is a draft only. No goal has been saved.',
  };
}
