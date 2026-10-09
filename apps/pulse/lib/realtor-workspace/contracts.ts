import { z } from 'zod';

const uuid = z.string().uuid();
const localDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}, 'Enter a valid calendar date.');
const localTime = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);
const cents = z.number().int().min(0).max(1_000_000_000_000);
const positiveCents = cents.min(1);
const requestKey = z.string().uuid();
const timeZoneSchema = z.string().trim().min(1).max(80).refine((value) => {
  try { new Intl.DateTimeFormat('en-US', { timeZone: value }).format(); return true; } catch { return false; }
}, 'Choose a valid time zone.');

export const realtorWorkspaceIdSchema = uuid;
export const realtorDateSchema = localDate;
export const realtorPlannerKindSchema = z.enum([
  'bill', 'professional_deadline', 'appointment', 'follow_up', 'task', 'weekly_review',
]);

export const recurrenceSchema = z.discriminatedUnion('frequency', [
  z.object({ frequency: z.literal('once') }).strict(),
  z.object({ frequency: z.literal('weekly'), interval: z.number().int().min(1).max(52) }).strict(),
  z.object({ frequency: z.literal('monthly'), interval: z.union([z.literal(1), z.literal(3)]) }).strict(),
  z.object({ frequency: z.literal('yearly'), interval: z.number().int().min(1).max(10) }).strict(),
]);

export const dueSpecSchema = z.object({
  anchorDate: localDate,
  localTime: localTime.nullable(),
  timeZone: timeZoneSchema,
  utcOffsetMinutes: z.number().int().min(-840).max(840).optional(),
  recurrence: recurrenceSchema,
  endsOn: localDate.nullable(),
  reminderOffsetsDays: z.array(z.number().int().min(0).max(365)).max(3)
    .refine((values) => new Set(values).size === values.length, 'Reminder days must be unique.'),
}).strict().superRefine((value, context) => {
  if (value.endsOn && value.endsOn < value.anchorDate) context.addIssue({ code: 'custom', path: ['endsOn'], message: 'The end date must be on or after the first date.' });
  if (value.recurrence.frequency === 'once' && value.endsOn && value.endsOn !== value.anchorDate) context.addIssue({ code: 'custom', path: ['endsOn'], message: 'A one-time item ends on its due date.' });
  if (value.utcOffsetMinutes !== undefined && (value.recurrence.frequency !== 'once' || value.localTime === null)) context.addIssue({ code: 'custom', path: ['utcOffsetMinutes'], message: 'An exact UTC offset requires a one-time appointment time.' });
});

export const propertyReferenceSchema = z.object({ propertyId: uuid }).strict();
export const sellerLeadReferenceSchema = z.object({
  leadId: uuid,
  actionKey: z.string().trim().min(1).max(120),
  expectedLeadRevision: z.number().int().positive(),
}).strict();

export const plannerItemInputSchema = z.object({
  kind: realtorPlannerKindSchema,
  title: z.string().trim().min(1).max(160),
  notes: z.string().max(2000).default(''),
  due: dueSpecSchema,
  expectedAmountCents: positiveCents.nullable().default(null),
  property: propertyReferenceSchema.nullable().default(null),
  sourceSprintTaskId: uuid.nullable().default(null),
  sellerLead: sellerLeadReferenceSchema.nullable().default(null),
  requestKey,
}).strict().superRefine((value, context) => {
  if (value.kind !== 'bill' && value.expectedAmountCents !== null) context.addIssue({ code: 'custom', path: ['expectedAmountCents'], message: 'Only a bill can have an expected amount.' });
  if (value.sourceSprintTaskId && value.kind !== 'task') context.addIssue({ code: 'custom', path: ['sourceSprintTaskId'], message: 'A sprint task link requires a task planner item.' });
  if (value.sellerLead && (!['follow_up', 'appointment'].includes(value.kind) || value.property || value.sourceSprintTaskId || value.due.recurrence.frequency !== 'once' || value.expectedAmountCents !== null)) {
    context.addIssue({ code: 'custom', path: ['sellerLead'], message: 'A seller action must be a one-time follow-up or appointment without a property or amount.' });
  }
  if (value.due.utcOffsetMinutes !== undefined && (!value.sellerLead || !value.sellerLead.actionKey.startsWith('consultation:') || value.kind !== 'appointment')) {
    context.addIssue({ code: 'custom', path: ['due', 'utcOffsetMinutes'], message: 'An exact time offset is allowed only for a confirmed seller consultation appointment.' });
  }
});

export const plannerItemSaveSchema = z.object({
  itemId: uuid.nullable(),
  expectedRevision: z.number().int().positive().nullable(),
  item: plannerItemInputSchema,
}).strict().refine((value) => (value.itemId === null) === (value.expectedRevision === null), 'New items have no ID or revision; edits require both.');

export const plannerMaterializeSchema = z.object({
  action: z.literal('materialize_occurrence'),
  itemId: uuid,
  expectedItemRevision: z.number().int().positive(),
  originalDate: localDate,
  requestKey,
}).strict();

export const plannerProjectionCursorSchema = z.object({
  itemId: uuid, afterDate: localDate, workspaceId: uuid, from: localDate, through: localDate,
}).strict();

export const plannerOccurrenceCursorSchema = z.object({
  date: localDate, id: uuid, workspaceId: uuid, from: localDate, through: localDate,
  status: z.enum(['', 'pending', 'completed', 'skipped', 'cancelled']),
}).strict();

export const financialRecordCursorSchema = z.object({
  workspaceId: uuid,
  year: z.number().int().min(2000).max(2200),
  limit: z.number().int().min(1).max(100),
  effectiveDate: localDate,
  id: uuid,
}).strict();

export const weeklyReviewInputSchema = z.object({
  reviewedUpcomingDates: z.literal(true),
  reviewedMissingExpenses: z.literal(true),
  priority: z.string().trim().min(1).max(200),
}).strict();

export const weeklyReviewInputV2Schema = z.object({
  version: z.literal(2),
  reviewedUpcomingDates: z.literal(true),
  reviewedMissingExpenses: z.literal(true),
  reviewedSellerOutcomes: z.literal(true),
  priority: z.string().trim().min(1).max(200),
  chosenNextAction: z.string().trim().min(1).max(200),
  friction: z.string().trim().max(500).nullable(),
}).strict();

export const occurrenceActionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('complete'), expectedRevision: z.number().int().positive(), requestKey, completionDetails: z.object({ weeklyReview: z.union([weeklyReviewInputSchema, weeklyReviewInputV2Schema]) }).strict().optional() }).strict(),
  z.object({ action: z.literal('reopen'), expectedRevision: z.number().int().positive(), requestKey }).strict(),
  z.object({ action: z.literal('skip'), expectedRevision: z.number().int().positive(), requestKey }).strict(),
  z.object({ action: z.literal('reschedule'), expectedRevision: z.number().int().positive(), requestKey, effectiveDate: localDate, localTime: localTime.nullable() }).strict(),
  z.object({ action: z.literal('record_payment'), expectedRevision: z.number().int().positive(), requestKey, paidAmountCents: positiveCents, paidDate: localDate }).strict(),
]);

export const reminderActionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('dismiss'), expectedRevision: z.number().int().positive(), requestKey }).strict(),
  z.object({ action: z.literal('snooze'), expectedRevision: z.number().int().positive(), requestKey, until: z.string().datetime({ offset: true }) }).strict(),
]);

const deductionSchema = z.object({
  kind: z.enum(['broker_split', 'transaction_fee', 'other_withheld']),
  label: z.string().trim().min(1).max(120),
  amountCents: positiveCents,
}).strict();

export const commissionInputSchema = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('gross'), grossCents: positiveCents, deductions: z.array(deductionSchema).max(20), receivedDate: localDate, closingReference: z.string().trim().min(1).max(120).nullable(), property: propertyReferenceSchema.nullable(), memo: z.string().max(1000).default(''), requestKey }).strict(),
  z.object({ mode: z.literal('net_deposit'), depositCents: positiveCents, receivedDate: localDate, closingReference: z.string().trim().min(1).max(120).nullable(), property: propertyReferenceSchema.nullable(), memo: z.string().max(1000).default(''), requestKey }).strict(),
]).superRefine((value, context) => {
  if (value.mode === 'gross' && value.deductions.reduce((sum, row) => sum + row.amountCents, 0) > value.grossCents) {
    context.addIssue({ code: 'custom', path: ['deductions'], message: 'Deductions cannot exceed gross commission.' });
  }
});

export const expenseInputSchema = z.object({
  amountCents: positiveCents,
  paidDate: localDate,
  category: z.enum(['broker_dues', 'mls', 'association', 'education', 'license', 'insurance', 'marketing', 'software', 'other']),
  payee: z.string().trim().max(160).default(''),
  note: z.string().max(1000).default(''),
  occurrenceId: uuid.nullable().default(null),
  requestKey,
}).strict();

export const expectedIncomeInputSchema = z.object({
  estimatedTakeHomeCents: positiveCents,
  expectedDate: localDate,
  label: z.string().trim().min(1).max(160),
  property: propertyReferenceSchema.nullable().default(null),
  requestKey,
}).strict();

export const financialMutationSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('void'), recordId: uuid, expectedRevision: z.number().int().positive(), requestKey }).strict(),
  z.object({ action: z.literal('correct_commission'), recordId: uuid, expectedRevision: z.number().int().positive(), entry: commissionInputSchema }).strict(),
  z.object({ action: z.literal('correct_expense'), recordId: uuid, expectedRevision: z.number().int().positive(), entry: expenseInputSchema }).strict(),
  z.object({ action: z.literal('correct_expected_income'), recordId: uuid, expectedRevision: z.number().int().positive(), entry: expectedIncomeInputSchema }).strict(),
  z.object({ action: z.literal('realize_expected'), recordId: uuid, expectedRevision: z.number().int().positive(), commission: commissionInputSchema }).strict(),
]);

export const goalInputSchema = z.object({
  metric: z.enum(['net_income', 'closings', 'weekly_reviews']),
  year: z.number().int().min(2000).max(2200),
  target: z.number().int().positive().max(1_000_000_000_000),
  expectedRevision: z.number().int().positive().nullable(),
  requestKey,
}).strict().refine((value) => value.metric === 'net_income' || value.target <= 100_000, {
  path: ['target'], message: 'Count goals must be 100,000 or fewer.',
});

export const realtorPreferencesSchema = z.object({
  timeZone: timeZoneSchema,
  remindersEnabled: z.boolean(),
  gamificationEnabled: z.boolean(),
  celebrationsEnabled: z.boolean(),
  hideAmountsOnToday: z.boolean(),
  recordsStartDate: localDate.nullable(),
  expectedRevision: z.number().int().positive().nullable(),
  requestKey,
}).strict();

export const plannerQuerySchema = z.object({
  from: localDate,
  through: localDate,
  status: z.enum(['pending', 'completed', 'skipped', 'cancelled']).optional(),
  cursor: z.string().max(512).optional(),
  projectionCursor: z.string().max(512).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
}).strict().refine((value) => value.through >= value.from && Date.parse(value.through + 'T00:00:00Z') - Date.parse(value.from + 'T00:00:00Z') <= 366 * 86400000, 'Choose a date range of at most one year.');

export type PlannerItemInput = z.infer<typeof plannerItemInputSchema>;
export type PlannerItemSave = z.infer<typeof plannerItemSaveSchema>;
export type DueSpec = z.infer<typeof dueSpecSchema>;
export type CommissionInput = z.infer<typeof commissionInputSchema>;
