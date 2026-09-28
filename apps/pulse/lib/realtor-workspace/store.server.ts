import 'server-only';

import { randomUUID } from 'node:crypto';
import { supabaseAdmin } from '@/lib/supabase';
import { expandOccurrences, reminderInstant } from './recurrence';
import { normalizeCommission } from './money';
import { dueSpecSchema, weeklyReviewInputSchema, type CommissionInput, type DueSpec, type PlannerItemInput } from './contracts';
import { localDateInZone, mondayOfLocalDate, readWeeklyReviewEvidence } from './progress';
import { RealtorWorkspaceError, throwRealtorRpcError } from './access.server';

function one<T>(data: T | T[] | null) {
  return Array.isArray(data) ? data[0] : data;
}

function getLocalDate(timeZone: string, date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)?.value || '';
  return value('year') + '-' + value('month') + '-' + value('day');
}

function addCalendarDays(date: string, days: number) {
  const [year, month, day] = date.split('-').map(Number);
  const result = new Date(Date.UTC(year, month - 1, day + days));
  return result.toISOString().slice(0, 10);
}

async function assertAuthorizedPlannerProperty(actorId: string, item: PlannerItemInput) {
  if (!item.property) return;
  const { data, error } = await supabaseAdmin.from('property_shortlist_entries').select('id')
    .eq('id', item.property.propertyId).eq('owner_id', actorId).eq('area_key', 'keller-westlake').maybeSingle();
  if (error) throw new RealtorWorkspaceError('FAILED');
  if (!data) throw new RealtorWorkspaceError('INVALID');
}

export async function getPreferences(actorId: string) {
  const { data, error } = await supabaseAdmin.from('realtor_preferences')
    .select('user_id,workspace_id,time_zone,reminders_enabled,gamification_enabled,celebrations_enabled,hide_amounts_on_today,records_start_date,revision')
    .eq('user_id', actorId).maybeSingle();
  if (error) throw new RealtorWorkspaceError('FAILED');
  return data;
}

export async function setupPersonalRealtorWorkspace(actorId: string, input: {
  timeZone: string; remindersEnabled: boolean; gamificationEnabled: boolean; celebrationsEnabled: boolean;
  hideAmountsOnToday: boolean; recordsStartDate: string | null; expectedRevision: number | null; requestKey: string;
}) {
  const { data, error } = await supabaseAdmin.rpc('realtor_setup_personal_workspace', {
    p_actor_id: actorId, p_workspace_id: randomUUID(), p_request_key: input.requestKey,
    p_expected_revision: input.expectedRevision, p_name: 'My Realtor Workspace', p_time_zone: input.timeZone,
    p_reminders_enabled: input.remindersEnabled, p_gamification_enabled: input.gamificationEnabled,
    p_celebrations_enabled: input.celebrationsEnabled, p_hide_amounts: input.hideAmountsOnToday,
    p_records_start_date: input.recordsStartDate,
  });
  if (error) throwRealtorRpcError(error.code);
  return one(data);
}

function buildOccurrenceCandidates(item: PlannerItemInput, now = new Date()) {
  const today = getLocalDate(item.due.timeZone, now);
  const from = item.due.recurrence.frequency === 'once' ? item.due.anchorDate : addCalendarDays(today, -45);
  const through = item.due.recurrence.frequency === 'once' ? item.due.anchorDate : addCalendarDays(today, 90);
  const expanded = expandOccurrences(item.due as DueSpec, from, through, 200);
  if (expanded.hasMore) throw new RealtorWorkspaceError('INVALID');
  const occurrences = expanded.occurrences.length === 0 && item.due.recurrence.frequency !== 'once'
    ? expandOccurrences(item.due as DueSpec, today, '2200-12-31', 1).occurrences
    : expanded.occurrences;
  return occurrences.map((occurrence) => ({
    ...occurrence,
    reminders: item.due.reminderOffsetsDays.map((offsetDays) => ({
      offsetDays,
      scheduledAt: reminderInstant(occurrence.effectiveDate, offsetDays, item.due.localTime, item.due.timeZone),
    })),
  }));
}

export async function savePlannerItem(actorId: string, workspaceId: string, input: {
  itemId: string | null; expectedRevision: number | null;
  item: PlannerItemInput;
}) {
  await assertAuthorizedPlannerProperty(actorId, input.item);
  const occurrences = buildOccurrenceCandidates(input.item);
  const { data, error } = await supabaseAdmin.rpc('realtor_save_planner_item', {
    p_actor_id: actorId, p_workspace_id: workspaceId, p_item_id: input.itemId,
    p_expected_revision: input.expectedRevision, p_request_key: input.item.requestKey,
    p_item: {
      kind: input.item.kind, title: input.item.title, notes: input.item.notes, due: input.item.due,
      expectedAmountCents: input.item.expectedAmountCents, property: input.item.property,
      ...(input.item.sourceSprintTaskId ? { sourceSprintTaskId: input.item.sourceSprintTaskId } : {}),
    },
    p_occurrences: occurrences,
  });
  if (error) throwRealtorRpcError(error.code);
  return one(data);
}

export async function listPlannerOccurrences(actorId: string, workspaceId: string, query: {
  from: string; through: string; status?: 'pending' | 'completed' | 'skipped' | 'cancelled'; limit: number;
  cursor?: { date: string; id: string; workspaceId: string; from: string; through: string; status: string };
}) {
  let request = supabaseAdmin.from('realtor_planner_occurrences')
    .select('id,item_id,workspace_id,occurrence_key,original_date,effective_date,effective_time,item_revision,title_snapshot,kind_snapshot,expected_amount_cents,status,completed_at,completion_details,revision,created_at')
    .eq('user_id', actorId).eq('workspace_id', workspaceId)
    .gte('effective_date', query.from).lte('effective_date', query.through)
    .order('effective_date', { ascending: true }).order('id', { ascending: true });
  if (query.status) request = request.eq('status', query.status);
  if (query.cursor) {
    if (query.cursor.workspaceId !== workspaceId || query.cursor.from !== query.from || query.cursor.through !== query.through || query.cursor.status !== (query.status || '')) {
      throw new RealtorWorkspaceError('INVALID');
    }
    request = request.or('effective_date.gt.' + query.cursor.date + ',and(effective_date.eq.' + query.cursor.date + ',id.gt.' + query.cursor.id + ')');
  }
  const { data, error } = await request.limit(query.limit + 1);
  if (error) throw new RealtorWorkspaceError('FAILED');
  const rows = data || [];
  const hasMore = rows.length > query.limit;
  const items = hasMore ? rows.slice(0, query.limit) : rows;
  const itemIds = [...new Set(items.map((item) => String(item.item_id)))];
  let propertyIds = new Map<string, string | null>();
  if (itemIds.length) {
    const { data: linkedItems, error: linkedItemsError } = await supabaseAdmin.from('realtor_planner_items')
      .select('id,property_id').in('id', itemIds).eq('user_id', actorId).eq('workspace_id', workspaceId);
    if (linkedItemsError) throw new RealtorWorkspaceError('FAILED');
    propertyIds = new Map((linkedItems || []).map((item) => [String(item.id), item.property_id ? String(item.property_id) : null]));
  }
  const itemsWithProperty = items.map((item) => ({ ...item, property_id: propertyIds.get(String(item.item_id)) || null }));
  const last = items[items.length - 1];
  return {
    items: itemsWithProperty,
    hasMore,
    nextCursor: hasMore && last ? {
      workspaceId, from: query.from, through: query.through, status: query.status || '',
      date: last.effective_date, id: last.id,
    } : null,
  };
}

type ProjectionCursor = { itemId: string; afterDate: string; workspaceId: string; from: string; through: string };

export async function projectPlannerOccurrences(actorId: string, workspaceId: string, query: {
  from: string; through: string; status?: string; limit: number; cursor?: ProjectionCursor;
}) {
  if (query.status && query.status !== 'pending') return { items: [], truncated: false, nextCursor: null };
  if (query.cursor && (query.cursor.workspaceId !== workspaceId || query.cursor.from !== query.from || query.cursor.through !== query.through)) {
    throw new RealtorWorkspaceError('INVALID');
  }
  let itemQuery = supabaseAdmin.from('realtor_planner_items')
      .select('id,revision,kind,title,expected_amount_cents,due_spec,property_id')
      .eq('user_id', actorId).eq('workspace_id', workspaceId).eq('status', 'active')
      .order('id', { ascending: true }).limit(201);
  if (query.cursor) itemQuery = itemQuery.gte('id', query.cursor.itemId);
  const { data: rawItems, error: itemError } = await itemQuery;
  if (itemError) throw new RealtorWorkspaceError('FAILED');
  const allItems = rawItems || [];
  const items = allItems.slice(0, 200);
  const sourceTruncated = allItems.length > 200;
  if (query.cursor && items[0]?.id !== query.cursor.itemId) throw new RealtorWorkspaceError('INVALID');
  const startIndex = 0;
  const projected: Array<Record<string, unknown>> = [];
  let nextCursor: ProjectionCursor | null = null;

  for (let itemIndex = startIndex; itemIndex < items.length; itemIndex += 1) {
    const item = items[itemIndex];
    const due = dueSpecSchema.parse(item.due_spec);
    let scanFrom = query.cursor && itemIndex === startIndex ? query.cursor.afterDate : query.from;
    while (scanFrom <= query.through) {
      const expansion = expandOccurrences(due, scanFrom, query.through, Math.min(200, Math.max(1, 201 - projected.length)));
      // Match immutable identity, not effective date: rescheduling outside this
      // window must not make the original occurrence appear pending again.
      // Bounded batches also stay below PostgREST's default row limit.
      const existing = new Set<string>();
      const keys = expansion.occurrences.map((candidate) => item.id + ':' + candidate.occurrenceKeyDate);
      for (let offset = 0; offset < keys.length; offset += 50) {
        const { data: rows, error } = await supabaseAdmin.from('realtor_planner_occurrences')
          .select('occurrence_key').eq('user_id', actorId).eq('workspace_id', workspaceId)
          .eq('item_id', item.id).in('occurrence_key', keys.slice(offset, offset + 50));
        if (error) throw new RealtorWorkspaceError('FAILED');
        for (const row of rows || []) existing.add(row.occurrence_key);
      }
      let continuationDate: string | null = expansion.nextDate;
      for (const candidate of expansion.occurrences) {
        const occurrenceKey = item.id + ':' + candidate.occurrenceKeyDate;
        if (existing.has(occurrenceKey)) continue;
        if (projected.length === 200) {
          continuationDate = candidate.occurrenceKeyDate;
          break;
        }
        projected.push({
          projected: true, itemId: item.id, itemRevision: item.revision,
          property_id: item.property_id,
          occurrenceKey, original_date: candidate.occurrenceKeyDate,
          effective_date: candidate.effectiveDate, effective_time: due.localTime,
          title_snapshot: item.title, kind_snapshot: item.kind,
          expected_amount_cents: item.expected_amount_cents, status: 'pending',
        });
      }
      if (continuationDate) {
        nextCursor = { itemId: item.id, afterDate: continuationDate, workspaceId, from: query.from, through: query.through };
        return { items: projected, truncated: true, nextCursor };
      }
      break;
    }
    if (projected.length === 200 && itemIndex + 1 < items.length) {
      nextCursor = { itemId: items[itemIndex + 1].id, afterDate: query.from, workspaceId, from: query.from, through: query.through };
      return { items: projected, truncated: true, nextCursor };
    }
  }

  if (sourceTruncated && !nextCursor && allItems.length > 200) {
    nextCursor = { itemId: allItems[200].id, afterDate: query.from, workspaceId, from: query.from, through: query.through };
  }
  return { items: projected, truncated: Boolean(nextCursor) || sourceTruncated, nextCursor };
}

export async function materializePlannerOccurrence(actorId: string, workspaceId: string, input: {
  itemId: string; expectedItemRevision: number; originalDate: string; requestKey: string;
}) {
  const { data: item, error } = await supabaseAdmin.from('realtor_planner_items')
    .select('id,revision,kind,title,expected_amount_cents,due_spec,status')
    .eq('id', input.itemId).eq('user_id', actorId).eq('workspace_id', workspaceId).maybeSingle();
  if (error) throw new RealtorWorkspaceError('FAILED');
  if (!item || item.status !== 'active') throw new RealtorWorkspaceError('NOT_FOUND');
  if (item.revision !== input.expectedItemRevision) throw new RealtorWorkspaceError('CONFLICT');
  const due = dueSpecSchema.parse(item.due_spec);
  const today = getLocalDate(due.timeZone);
  if (input.originalDate < addCalendarDays(today, -45) || input.originalDate > addCalendarDays(today, 366)) {
    throw new RealtorWorkspaceError('INVALID');
  }
  const occurrence = expandOccurrences(due, input.originalDate, input.originalDate, 1).occurrences[0];
  if (!occurrence) throw new RealtorWorkspaceError('INVALID');
  const reminders = due.reminderOffsetsDays.map((offsetDays) => ({
    offsetDays,
    scheduledAt: reminderInstant(occurrence.effectiveDate, offsetDays, due.localTime, due.timeZone),
  }));
  const { data: saved, error: saveError } = await supabaseAdmin.rpc('realtor_materialize_planner_occurrence', {
    p_actor_id: actorId, p_workspace_id: workspaceId, p_item_id: item.id,
    p_expected_item_revision: input.expectedItemRevision, p_request_key: input.requestKey,
    p_original_date: occurrence.occurrenceKeyDate, p_reminders: reminders,
  });
  if (saveError) throwRealtorRpcError(saveError.code);
  return one(saved);
}

export async function listTodayOccurrences(actorId: string, workspaceId: string, timeZone: string) {
  const today = getLocalDate(timeZone);
  const through = addCalendarDays(today, 30);
  const [overdueResponse, upcomingResponse, reminderResponse] = await Promise.all([
    supabaseAdmin.from('realtor_planner_occurrences')
      .select('id,item_id,occurrence_key,effective_date,effective_time,title_snapshot,kind_snapshot,expected_amount_cents,status,revision')
      .eq('user_id', actorId).eq('workspace_id', workspaceId).eq('status', 'pending')
      .lt('effective_date', today).order('effective_date', { ascending: true }).limit(5),
    supabaseAdmin.from('realtor_planner_occurrences')
      .select('id,item_id,occurrence_key,effective_date,effective_time,title_snapshot,kind_snapshot,expected_amount_cents,status,revision')
      .eq('user_id', actorId).eq('workspace_id', workspaceId).eq('status', 'pending')
      .gte('effective_date', today).lte('effective_date', through).order('effective_date', { ascending: true }).limit(5),
    supabaseAdmin.from('realtor_reminders')
      .select('id,occurrence_id,scheduled_at,status,revision')
      .eq('user_id', actorId).eq('workspace_id', workspaceId).eq('status', 'visible')
      .order('scheduled_at', { ascending: true }).limit(5),
  ]);
  const failure = overdueResponse.error || upcomingResponse.error || reminderResponse.error;
  if (failure) throw new RealtorWorkspaceError('FAILED');
  const reminderRows = reminderResponse.data || [];
  const agendaRows = [...(overdueResponse.data || []), ...(upcomingResponse.data || [])];
  const occurrenceIds = [...new Set([...agendaRows.map((item) => String(item.id)), ...reminderRows.map((reminder) => String(reminder.occurrence_id))])];
  const { data: linkedOccurrences, error: linkedError } = occurrenceIds.length
    ? await supabaseAdmin.from('realtor_planner_occurrences').select('id,item_id,title_snapshot,effective_date').in('id', occurrenceIds).eq('user_id', actorId).eq('workspace_id', workspaceId)
    : { data: [], error: null };
  if (linkedError) throw new RealtorWorkspaceError('FAILED');
  const occurrenceById = new Map((linkedOccurrences || []).map((occurrence) => [occurrence.id, occurrence]));
  const itemIds = [...new Set((linkedOccurrences || []).map((occurrence) => String(occurrence.item_id)))];
  const { data: linkedItems, error: itemError } = itemIds.length
    ? await supabaseAdmin.from('realtor_planner_items').select('id,property_id').in('id', itemIds).eq('user_id', actorId).eq('workspace_id', workspaceId)
    : { data: [], error: null };
  if (itemError) throw new RealtorWorkspaceError('FAILED');
  const propertyIds = [...new Set((linkedItems || []).map((item) => String(item.property_id || '')).filter(Boolean))];
  const { data: properties, error: propertyError } = propertyIds.length
    ? await supabaseAdmin.from('property_shortlist_entries').select('id,address,city,state,mls_id').in('id', propertyIds).eq('owner_id', actorId).eq('area_key', 'keller-westlake')
    : { data: [], error: null };
  if (propertyError) throw new RealtorWorkspaceError('FAILED');
  const propertyIdByItem = new Map((linkedItems || []).map((item) => [String(item.id), item.property_id ? String(item.property_id) : null] as const));
  const propertyLabelById = new Map((properties || []).map((property) => [String(property.id), [property.address || property.mls_id || 'Shortlist property', [property.city, property.state].filter(Boolean).join(', ')].filter(Boolean).join(' · ')] as const));
  const withProperty = <T extends { item_id?: string; id?: string }>(row: T) => {
    const occurrence = row.item_id ? row : row.id ? occurrenceById.get(row.id) : null;
    const propertyId = occurrence?.item_id ? propertyIdByItem.get(String(occurrence.item_id)) || null : null;
    return { ...row, property_id: propertyId, property_label: propertyId ? propertyLabelById.get(propertyId) || null : null };
  };
  return {
    asOfDate: today,
    overdue: (overdueResponse.data || []).map(withProperty),
    upcoming: (upcomingResponse.data || []).map(withProperty),
    reminders: reminderRows.map((reminder) => ({ ...reminder, occurrence: occurrenceById.has(reminder.occurrence_id) ? withProperty(occurrenceById.get(reminder.occurrence_id)!) : null })),
  };
}

export async function listVisibleReminders(actorId: string, workspaceId: string, limit = 5) {
  const { data, error } = await supabaseAdmin.from('realtor_reminders')
    .select('id,occurrence_id,scheduled_at,status,revision,offset_days')
    .eq('user_id', actorId).eq('workspace_id', workspaceId).eq('status', 'visible')
    .order('scheduled_at', { ascending: true }).limit(Math.min(Math.max(limit, 1), 20));
  if (error) throw new RealtorWorkspaceError('FAILED');
  return data || [];
}

export async function updateReminder(actorId: string, workspaceId: string, reminderId: string, input: {
  action: 'dismiss' | 'snooze'; expectedRevision: number; requestKey: string; until?: string;
}) {
  const { data, error } = await supabaseAdmin.rpc('realtor_update_reminder', {
    p_actor_id: actorId, p_workspace_id: workspaceId, p_reminder_id: reminderId,
    p_expected_revision: input.expectedRevision, p_request_key: input.requestKey,
    p_action: input.action, p_until: input.until ?? null,
  });
  if (error) throwRealtorRpcError(error.code);
  return one(data);
}

export async function applyOccurrenceAction(actorId: string, workspaceId: string, occurrenceId: string, input: {
  action: 'complete' | 'reopen' | 'skip' | 'reschedule';
  expectedRevision: number; requestKey: string; effectiveDate?: string; localTime?: string | null;
  completionDetails?: Record<string, unknown>;
}) {
  let completionDetails: Record<string, unknown> = {};
  if (input.action === 'complete') {
    const { data: occurrence, error: occurrenceError } = await supabaseAdmin.from('realtor_planner_occurrences')
      .select('kind_snapshot').eq('id', occurrenceId).eq('user_id', actorId).eq('workspace_id', workspaceId).maybeSingle();
    if (occurrenceError) throw new RealtorWorkspaceError('FAILED');
    if (!occurrence) throw new RealtorWorkspaceError('NOT_FOUND');
    if (occurrence.kind_snapshot === 'weekly_review') {
      const checklist = input.completionDetails?.weeklyReview;
      const parsed = weeklyReviewInputSchema.safeParse(checklist);
      if (!parsed.success || Object.keys(input.completionDetails || {}).some((key) => key !== 'weeklyReview')) throw new RealtorWorkspaceError('INVALID');
      const preferences = await getPreferences(actorId);
      if (!preferences || preferences.workspace_id !== workspaceId) throw new RealtorWorkspaceError('FORBIDDEN');
      const localWeekKey = mondayOfLocalDate(getLocalDate(preferences.time_zone));
      completionDetails = { weeklyReview: {
        version: 1, ...parsed.data, timeZone: preferences.time_zone, localWeekKey,
      } };
    } else if (input.completionDetails && Object.keys(input.completionDetails).length) {
      throw new RealtorWorkspaceError('INVALID');
    }
  } else if (input.completionDetails && Object.keys(input.completionDetails).length) {
    throw new RealtorWorkspaceError('INVALID');
  }
  const { data, error } = await supabaseAdmin.rpc('realtor_apply_occurrence_action', {
    p_actor_id: actorId, p_workspace_id: workspaceId, p_occurrence_id: occurrenceId,
    p_expected_revision: input.expectedRevision, p_request_key: input.requestKey, p_action: input.action,
    p_effective_date: input.effectiveDate ?? null, p_effective_time: input.localTime ?? null,
    p_completion_details: completionDetails,
  });
  if (error) throwRealtorRpcError(error.code);
  return one(data);
}

async function saveFinancialRecord(actorId: string, workspaceId: string, args: {
  recordId?: string | null; expectedRevision?: number | null; requestKey: string; kind: string;
  date: string; data: Record<string, unknown>; occurrenceId?: string | null; expectedOccurrenceRevision?: number | null;
}) {
  if (args.recordId && args.expectedRevision) {
    const { data, error } = await supabaseAdmin.rpc('realtor_correct_financial_record', {
      p_actor_id: actorId, p_workspace_id: workspaceId, p_record_id: args.recordId,
      p_expected_revision: args.expectedRevision, p_request_key: args.requestKey,
      p_kind: args.kind, p_effective_date: args.date, p_data: args.data,
    });
    if (error) throwRealtorRpcError(error.code);
    return one(data);
  }
  const { data, error } = await supabaseAdmin.rpc('realtor_save_financial_record', {
    p_actor_id: actorId, p_workspace_id: workspaceId, p_record_id: args.recordId ?? null,
    p_expected_revision: args.expectedRevision ?? null, p_request_key: args.requestKey, p_kind: args.kind,
    p_effective_date: args.date, p_data: args.data, p_occurrence_id: args.occurrenceId ?? null,
    p_expected_occurrence_revision: args.expectedOccurrenceRevision ?? null,
  });
  if (error) throwRealtorRpcError(error.code);
  return one(data);
}

export async function recordCommission(actorId: string, workspaceId: string, input: CommissionInput, correction?: {
  recordId: string; expectedRevision: number;
}) {
  const normalized = normalizeCommission(input);
  const data = input.mode === 'gross'
    ? { mode: 'gross', grossCents: input.grossCents, withheldCents: normalized.withheldCents, deductions: normalized.deductions, receivedCents: normalized.receivedCents, closingReference: input.closingReference, memo: input.memo }
    : { mode: 'net_deposit', depositCents: input.depositCents, closingReference: input.closingReference, memo: input.memo };
  return saveFinancialRecord(actorId, workspaceId, {
    requestKey: input.requestKey, kind: 'commission', date: input.receivedDate, data,
    recordId: correction?.recordId, expectedRevision: correction?.expectedRevision,
  });
}

export async function recordExpense(actorId: string, workspaceId: string, input: {
  amountCents: number; paidDate: string; category: string; payee: string; note: string;
  occurrenceId: string | null; requestKey: string; expectedOccurrenceRevision?: number | null;
}, correction?: { recordId: string; expectedRevision: number }) {
  return saveFinancialRecord(actorId, workspaceId, {
    requestKey: input.requestKey, kind: 'expense', date: input.paidDate,
    data: { amountCents: input.amountCents, category: input.category, payee: input.payee, note: input.note },
    occurrenceId: correction ? null : input.occurrenceId,
    expectedOccurrenceRevision: correction ? null : input.expectedOccurrenceRevision ?? null,
    recordId: correction?.recordId, expectedRevision: correction?.expectedRevision,
  });
}

export async function recordExpectedIncome(actorId: string, workspaceId: string, input: {
  estimatedTakeHomeCents: number; expectedDate: string; label: string; requestKey: string;
}, correction?: { recordId: string; expectedRevision: number }) {
  return saveFinancialRecord(actorId, workspaceId, {
    requestKey: input.requestKey, kind: 'expected_commission', date: input.expectedDate,
    data: { estimatedTakeHomeCents: input.estimatedTakeHomeCents, label: input.label },
    recordId: correction?.recordId, expectedRevision: correction?.expectedRevision,
  });
}

export async function voidFinancialRecord(actorId: string, workspaceId: string, input: {
  recordId: string; expectedRevision: number; requestKey: string;
}) {
  const { data, error } = await supabaseAdmin.rpc('realtor_void_financial_record', {
    p_actor_id: actorId, p_workspace_id: workspaceId, p_record_id: input.recordId,
    p_expected_revision: input.expectedRevision, p_request_key: input.requestKey,
  });
  if (error) throwRealtorRpcError(error.code);
  return one(data);
}

export async function realizeExpectedIncome(actorId: string, workspaceId: string, input: {
  recordId: string; expectedRevision: number; commission: CommissionInput;
}) {
  const commission = input.commission;
  const normalized = normalizeCommission(commission);
  const data = commission.mode === 'gross'
    ? { mode: 'gross', grossCents: commission.grossCents, withheldCents: normalized.withheldCents,
      deductions: normalized.deductions, receivedCents: normalized.receivedCents,
      closingReference: commission.closingReference, memo: commission.memo }
    : { mode: 'net_deposit', depositCents: commission.depositCents,
      closingReference: commission.closingReference, memo: commission.memo };
  const { data: saved, error } = await supabaseAdmin.rpc('realtor_realize_expected_income', {
    p_actor_id: actorId, p_workspace_id: workspaceId, p_expected_record_id: input.recordId,
    p_expected_revision: input.expectedRevision, p_request_key: commission.requestKey,
    p_effective_date: commission.receivedDate, p_commission_data: data,
  });
  if (error) throwRealtorRpcError(error.code);
  return one(saved);
}

export async function readBusinessSummary(actorId: string, workspaceId: string, year: number) {
  const historyActions = [
    'realtor.financial.commission', 'realtor.financial.expense',
    'realtor.financial.correct', 'realtor.financial.void', 'realtor.financial.realize',
    'realtor.weekly_review.completed', 'realtor.weekly_review.left_completed',
    'realtor.goal.created', 'realtor.goal.updated', 'realtor.goal.archived',
  ];
  const summaryPromise = supabaseAdmin.rpc('realtor_read_business_summary', {
      p_actor_id: actorId, p_workspace_id: workspaceId, p_year: year,
    });
  const reviewsPromise = supabaseAdmin.from('realtor_planner_occurrences')
      .select('completion_details,completed_at').eq('user_id', actorId).eq('workspace_id', workspaceId)
      .eq('kind_snapshot', 'weekly_review').eq('status', 'completed').not('completed_at', 'is', null)
      .order('completed_at', { ascending: false }).limit(5000);
  const historyPromise = supabaseAdmin.from('platform_audit_events')
      .select('id,action,safe_metadata,occurred_at').eq('workspace_id', workspaceId).eq('actor_id', actorId)
      .in('action', historyActions).order('occurred_at', { ascending: false }).order('id', { ascending: false }).limit(20);
  const [summaryResult, reviewResult, historyResult] = await Promise.allSettled([summaryPromise, reviewsPromise, historyPromise]);
  if (summaryResult.status === 'rejected' || reviewResult.status === 'rejected') throw new RealtorWorkspaceError('FAILED');
  const { data, error } = summaryResult.value;
  const { data: reviewRows, error: reviewError } = reviewResult.value;
  if (error) throwRealtorRpcError(error.code);
  if (reviewError) throw new RealtorWorkspaceError('FAILED');
  const historyAvailable = historyResult.status === 'fulfilled' && !historyResult.value.error;
  const historyRows = historyAvailable ? historyResult.value.data : [];
  const summary = one(data);
  if (!summary) throw new RealtorWorkspaceError('FAILED');
  const completedReviews = (reviewRows || []).flatMap((row) => {
    const evidence = readWeeklyReviewEvidence(row.completion_details);
    return evidence ? [{ ...evidence, completedAt: row.completed_at as string }] : [];
  });
  const distinctWeeks = [...new Set(completedReviews
    .filter((review) => localDateInZone(new Date(review.completedAt), review.timeZone).startsWith(String(year) + '-'))
    .map((review) => review.localWeekKey))];
  const progressHistory = (historyRows || []).map((row) => {
    const metadata = row.safe_metadata && typeof row.safe_metadata === 'object' ? row.safe_metadata as Record<string, unknown> : {};
    const kind = typeof metadata.kind === 'string' ? metadata.kind : '';
    const week = typeof metadata.localWeekKey === 'string' ? metadata.localWeekKey : null;
    const labels: Record<string, { title: string; explanation: string }> = {
      'realtor.financial.commission': { title: 'Commission recorded', explanation: 'Current active commission records determine income and closing progress.' },
      'realtor.financial.expense': { title: 'Business expense recorded', explanation: 'Current active expenses are included in recorded net income.' },
      'realtor.financial.correct': { title: 'Financial record corrected', explanation: 'Progress now reflects the record’s current revision.' },
      'realtor.financial.void': { title: 'Financial record voided', explanation: 'A voided record no longer contributes to active progress.' },
      'realtor.financial.realize': { title: 'Expected income recorded as received', explanation: 'The realized commission now contributes to recorded totals; the estimate alone did not.' },
      'realtor.weekly_review.completed': { title: 'Weekly review completed', explanation: 'This checklist contributed one review for its local week.' },
      'realtor.weekly_review.left_completed': { title: 'Weekly review no longer completed', explanation: 'The review no longer counts toward completed-review progress.' },
      'realtor.goal.created': { title: 'Progress goal created', explanation: 'This goal is now available to the current progress calculation.' },
      'realtor.goal.updated': { title: 'Progress goal updated', explanation: 'Goal-percentage milestones are recalculated against the new target.' },
      'realtor.goal.archived': { title: 'Progress goal archived', explanation: 'The archived goal is no longer used for current progress or goal milestones.' },
    };
    const display = labels[row.action] || { title: 'Progress source changed', explanation: 'Progress is recalculated from current active records.' };
    return {
      id: row.id,
      occurredAt: row.occurred_at,
      title: display.title,
      explanation: kind ? display.explanation + ' Record type: ' + kind.replace('_', ' ') + '.' : display.explanation,
      localWeekKey: week,
      timeZone: typeof metadata.timeZone === 'string' ? metadata.timeZone : null,
      effectiveDate: typeof metadata.effectiveDate === 'string' ? metadata.effectiveDate : null,
      toStatus: typeof metadata.toStatus === 'string' ? metadata.toStatus : null,
      metric: typeof metadata.metric === 'string' ? metadata.metric : null,
    };
  });
  return {
    ...summary,
    completedWeeklyReviews: distinctWeeks.length,
    completedReviewWeeks: completedReviews.map(({ localWeekKey }) => ({ localWeekKey })),
    progressHistory,
    progressHistoryAvailable: historyAvailable,
    grossComplete: Number(summary.netOnlyReceiptCount || 0) === 0,
    recordedNetLabel: 'Recorded net before taxes',
  };
}

export async function listFinancialRecords(actorId: string, workspaceId: string, year: number, limit = 50, cursor?: {
  effectiveDate: string; id: string;
}) {
  const start = year + '-01-01';
  const end = (year + 1) + '-01-01';
  let query = supabaseAdmin.from('realtor_financial_current')
    .select('id,kind,current_revision,occurrence_id,realized_by_record_id,status,effective_date,data,created_at')
    .eq('user_id', actorId).eq('workspace_id', workspaceId).gte('effective_date', start).lt('effective_date', end)
    .order('effective_date', { ascending: false }).order('id', { ascending: false });
  if (cursor) query = query.or(`effective_date.lt.${cursor.effectiveDate},and(effective_date.eq.${cursor.effectiveDate},id.lt.${cursor.id})`);
  const { data, error } = await query.limit(Math.min(Math.max(limit, 1), 100) + 1);
  if (error) throw new RealtorWorkspaceError('FAILED');
  const entries = data || [];
  const page = entries.slice(0, limit);
  const last = page.at(-1);
  return {
    entries: page,
    nextCursor: entries.length > limit && last ? {
      workspaceId, year, limit, effectiveDate: last.effective_date, id: last.id,
    } : null,
  };
}

export async function listFinancialRecordsForExport(actorId: string, workspaceId: string, year: number) {
  const start = year + '-01-01';
  const end = (year + 1) + '-01-01';
  const pageSize = 500;
  const maxRows = 10_000;
  const rows: Array<Record<string, any>> = [];
  let expectedCount: number | null = null;

  for (let offset = 0; offset <= maxRows; offset += pageSize) {
    const { data, error, count } = await supabaseAdmin.from('realtor_financial_current')
      .select('id,kind,current_revision,occurrence_id,realized_by_record_id,status,effective_date,data,created_at', { count: 'exact' })
      .eq('user_id', actorId).eq('workspace_id', workspaceId).gte('effective_date', start).lt('effective_date', end)
      .order('effective_date', { ascending: false }).order('id', { ascending: false })
      .range(offset, offset + pageSize - 1);
    if (error || count === null) throw new RealtorWorkspaceError('FAILED');
    expectedCount ??= count;
    if (count !== expectedCount) throw new RealtorWorkspaceError('CONFLICT');
    if (expectedCount > maxRows) return { rows: [], tooMany: true };
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }

  if (rows.length !== expectedCount) throw new RealtorWorkspaceError('CONFLICT');
  return { rows, tooMany: false };
}

export async function saveGoal(actorId: string, workspaceId: string, input: {
  id: string | null; metric: string; year: number; target: number; expectedRevision: number | null; requestKey: string; archive?: boolean;
}) {
  const { data, error } = await supabaseAdmin.rpc('realtor_save_goal', {
    p_actor_id: actorId, p_workspace_id: workspaceId, p_goal_id: input.id, p_expected_revision: input.expectedRevision,
    p_request_key: input.requestKey, p_year: input.year, p_metric: input.metric, p_target: input.target,
    p_archive: input.archive ?? false,
  });
  if (error) throwRealtorRpcError(error.code);
  return one(data);
}

export async function listGoals(actorId: string, workspaceId: string, year: number) {
  const { data, error } = await supabaseAdmin.from('realtor_goals')
    .select('id,year,metric,target,revision,status,created_at,updated_at')
    .eq('user_id', actorId).eq('workspace_id', workspaceId).eq('year', year).eq('status', 'active')
    .order('metric', { ascending: true }).limit(20);
  if (error) throw new RealtorWorkspaceError('FAILED');
  return data || [];
}
