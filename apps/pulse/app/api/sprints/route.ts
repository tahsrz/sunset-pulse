import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { isAuthResponse, requireSignedInUser } from '@/lib/core/routeAuth';
import { nextOccurrenceAfter, scheduleSpecSchema } from '@/lib/autonomous-workflows/schedulerPolicy';
import { intelligenceWorkers } from '@/lib/command-center/workerRoster';
import { listSprintsForWorkspace } from '@/lib/property-sprints/sprintWorkspace.server';
import { requireOwnerCompatibleMutation } from '@/lib/platform/access/sprintPlanningScope.server';

const uuid = z.string().uuid();
const item = z.object({ title: z.string().trim().min(1).max(240), description: z.string().trim().max(2000).default(''), priority: z.number().int().min(1).max(5).default(3), estimateMinutes: z.number().int().min(1).max(10080).nullable().default(null) });
const sprintScheduleSpec = scheduleSpecSchema.extend({ cadence: z.enum(['daily', 'weekly']) });
const requestSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('create_schedule'), workspaceId: uuid.nullable().optional(), planningMode: z.enum(['manual_backlog', 'property_shortlist']).default('manual_backlog'), expectedRevision: z.number().int().positive().nullable().default(null) }).merge(sprintScheduleSpec),
  z.object({ action: z.literal('create'), name: z.string().trim().min(1).max(160), goal: z.string().trim().min(1).max(2000), startsAt: z.string().datetime().nullable().default(null), endsAt: z.string().datetime().nullable().default(null), items: z.array(item).max(100).default([]) }),
  z.object({ action: z.literal('approve'), sprintId: uuid, workspaceId: uuid.nullable().optional(), expectedRevision: z.number().int().positive().nullable().default(null) }),
  z.object({ action: z.literal('remove_backlog_item'), workspaceId: uuid.nullable().optional(), itemId: uuid, expectedRevision: z.number().int().positive().nullable().default(null) }),
  z.object({ action: z.literal('update_backlog_item'), workspaceId: uuid.nullable().optional(), itemId: uuid, expectedRevision: z.number().int().positive().nullable().default(null), title: z.string().trim().min(1).max(240), description: z.string().trim().max(2000).optional(), priority: z.number().int().min(1).max(5), estimateMinutes: z.number().int().min(1).max(10080).nullable(), status: z.enum(['open','in_progress','done','cancelled']) }),
  z.object({ action: z.literal('remove_sprint_item'), itemId: uuid, sprintId: uuid, expectedRevision: z.number().int().positive() }),
  z.object({ action: z.literal('update_sprint_item'), itemId: uuid, sprintId: uuid, expectedSprintRevision: z.number().int().positive(), title: z.string().trim().min(1).max(240), description: z.string().trim().max(2000), priority: z.number().int().min(1).max(5), estimateMinutes: z.number().int().min(1).max(10080).nullable(), workerId: z.string().trim().min(1).max(120).nullable() }),
  z.object({ action: z.literal('complete_assignment'), assignmentId: uuid }),
  z.object({ action: z.literal('add_backlog_item'), workspaceId: uuid.nullable().optional(), title: z.string().trim().min(1).max(240), description: z.string().trim().max(2000).default(''), priority: z.number().int().min(1).max(5).default(3), estimateMinutes: z.number().int().min(1).nullable().default(null), sourceType: z.enum(['manual', 'pulse_command']).default('manual'), sourceId: z.string().trim().max(160).nullable().default(null) }),
]);

async function legacyMutationGuard(userId: string, resourceType: 'sprint' | 'assignment' | 'sprint_backlog_item', resourceId: string) {
  try {
    await requireOwnerCompatibleMutation(userId, resourceType, resourceId);
    return null;
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Workspace scope is required.' }, { status: 409 });
  }
}

export async function GET(request: NextRequest) {
  const access = await requireSignedInUser(request);
  if (isAuthResponse(access)) return access;
  const userId = access.user.id;
  if (!uuid.safeParse(userId).success) return NextResponse.json({ ok: false, error: 'A signed-in user is required.' }, { status: 401 });
  const workspaceId = request.nextUrl.searchParams.get('workspaceId');
  if (workspaceId) {
    try {
      return NextResponse.json({ ok: true, ...(await listSprintsForWorkspace(userId, workspaceId)) });
    } catch (error) {
      return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Unable to load workspace sprints.' }, { status: 403 });
    }
  }
  const [{ data: sprints, error: sprintError }, { data: items, error: itemError }, { data: assignments, error: assignmentError }, { data: backlog, error: backlogError }, { data: schedules, error: scheduleError }] = await Promise.all([
    supabaseAdmin.from('sprints').select('*').eq('owner_id', userId).order('created_at', { ascending: false }).limit(50),
    supabaseAdmin.from('sprint_items').select('*').eq('owner_id', userId).order('priority').limit(500),
    supabaseAdmin.from('agent_assignments').select('*').eq('owner_id', userId).order('created_at', { ascending: false }).limit(500),
    supabaseAdmin.from('sprint_backlog_items').select('*').eq('owner_id', userId).order('priority').limit(500),
    supabaseAdmin.from('workflow_schedules').select('id,workflow_key,planning_mode,enabled,cadence,time_zone,local_hour,local_minute,local_weekday,next_run_at,revision').eq('user_id', userId).eq('workflow_key', 'sprint_planner'),
  ]);
  const readError = sprintError || itemError || assignmentError || backlogError || scheduleError;
  if (readError) return NextResponse.json({ ok: false, error: readError.message }, { status: 500 });
  return NextResponse.json({ ok: true, sprints: sprints || [], items: items || [], assignments: assignments || [], backlog: backlog || [], schedules: schedules || [] });
}

export async function POST(request: NextRequest) {
  const access = await requireSignedInUser(request);
  if (isAuthResponse(access)) return access;
  const userId = access.user.id;
  if (!uuid.safeParse(userId).success) return NextResponse.json({ ok: false, error: 'A signed-in user is required.' }, { status: 401 });
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: 'Invalid sprint request.', details: parsed.error.flatten() }, { status: 400 });
  if (parsed.data.action === 'create_schedule') {
    const nextRunAt = nextOccurrenceAfter(new Date(), { cadence: parsed.data.cadence, timeZone: parsed.data.timeZone, localHour: parsed.data.localHour, localMinute: parsed.data.localMinute, localWeekday: parsed.data.localWeekday });
    const { data, error } = parsed.data.workspaceId
      ? await supabaseAdmin.rpc('platform_save_sprint_planner_schedule', { p_actor_id: userId, p_workspace_id: parsed.data.workspaceId, p_expected_revision: parsed.data.expectedRevision, p_planning_mode: parsed.data.planningMode, p_cadence: parsed.data.cadence, p_time_zone: parsed.data.timeZone, p_local_hour: parsed.data.localHour, p_local_minute: parsed.data.localMinute, p_local_weekday: parsed.data.localWeekday, p_next_run_at: nextRunAt })
      : await supabaseAdmin.rpc('save_sprint_planner_schedule', { p_owner_id: userId, p_expected_revision: parsed.data.expectedRevision, p_planning_mode: parsed.data.planningMode, p_cadence: parsed.data.cadence, p_time_zone: parsed.data.timeZone, p_local_hour: parsed.data.localHour, p_local_minute: parsed.data.localMinute, p_local_weekday: parsed.data.localWeekday, p_next_run_at: nextRunAt });
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 409 });
    return NextResponse.json({ ok: true, schedule: data?.[0] || null });
  }
  if (parsed.data.action === 'approve') {
    const { data, error } = parsed.data.workspaceId
      ? await supabaseAdmin.rpc('platform_approve_sprint_with_assignments', { p_actor_id: userId, p_workspace_id: parsed.data.workspaceId, p_sprint_id: parsed.data.sprintId, p_expected_revision: parsed.data.expectedRevision })
      : await supabaseAdmin.rpc('approve_sprint_with_assignments', { p_sprint_id: parsed.data.sprintId, p_owner_id: userId, p_expected_revision: parsed.data.expectedRevision });
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 409 });
    return NextResponse.json({ ok: true, approval: data?.[0] || null });
  }
  if (parsed.data.action === 'add_backlog_item') {
    if (parsed.data.workspaceId) {
      const { data, error } = await supabaseAdmin.rpc('platform_add_sprint_backlog_item', { p_actor_id: userId, p_workspace_id: parsed.data.workspaceId, p_title: parsed.data.title, p_description: parsed.data.description, p_priority: parsed.data.priority, p_estimate_minutes: parsed.data.estimateMinutes, p_source_type: parsed.data.sourceType, p_source_id: parsed.data.sourceId });
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 409 });
      return NextResponse.json({ ok: true, backlogItem: data?.[0] || null }, { status: 201 });
    }
    if (parsed.data.sourceType === 'pulse_command' && parsed.data.sourceId) {
      const { data: existing, error: lookupError } = await supabaseAdmin.from('sprint_backlog_items').select('*').eq('owner_id', userId).eq('source_type', parsed.data.sourceType).eq('source_id', parsed.data.sourceId).maybeSingle();
      if (lookupError) return NextResponse.json({ ok: false, error: lookupError.message }, { status: 500 });
      if (existing) return NextResponse.json({ ok: true, backlogItem: existing, reused: true });
    }
    const { data, error } = await supabaseAdmin.from('sprint_backlog_items').insert({ owner_id: userId, title: parsed.data.title, description: parsed.data.description, priority: parsed.data.priority, estimate_minutes: parsed.data.estimateMinutes, source_type: parsed.data.sourceType, source_id: parsed.data.sourceId }).select('*').single();
    if (error?.code === '23505' && parsed.data.sourceType === 'pulse_command' && parsed.data.sourceId) {
      const { data: existing, error: lookupError } = await supabaseAdmin.from('sprint_backlog_items').select('*').eq('owner_id', userId).eq('source_type', 'pulse_command').eq('source_id', parsed.data.sourceId).maybeSingle();
      if (!lookupError && existing) return NextResponse.json({ ok: true, backlogItem: existing, reused: true });
    }
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, backlogItem: data }, { status: 201 });
  }
  if (parsed.data.action === 'remove_backlog_item') {
    if (parsed.data.workspaceId) {
      const { data, error } = await supabaseAdmin.rpc('platform_remove_sprint_backlog_item', { p_actor_id: userId, p_workspace_id: parsed.data.workspaceId, p_item_id: parsed.data.itemId, p_expected_revision: parsed.data.expectedRevision });
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 409 });
      return NextResponse.json({ ok: true, backlogItem: data?.[0] || null });
    }
    const blocked = await legacyMutationGuard(userId, 'sprint_backlog_item', parsed.data.itemId);
    if (blocked) return blocked;
    const { error } = await supabaseAdmin.from('sprint_backlog_items').update({ status: 'cancelled' }).eq('id', parsed.data.itemId).eq('owner_id', userId).eq('status', 'open');
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }
  if (parsed.data.action === 'update_backlog_item') {
    if (parsed.data.workspaceId) {
      const updates = parsed.data;
      const { data, error } = await supabaseAdmin.rpc('platform_update_sprint_backlog_item', { p_actor_id: userId, p_workspace_id: parsed.data.workspaceId, p_item_id: updates.itemId, p_expected_revision: updates.expectedRevision, p_title: updates.title, p_description: updates.description ?? '', p_priority: updates.priority, p_estimate_minutes: updates.estimateMinutes, p_status: updates.status });
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 409 });
      return NextResponse.json({ ok: true, backlogItem: data?.[0] || null });
    }
    const blocked = await legacyMutationGuard(userId, 'sprint_backlog_item', parsed.data.itemId);
    if (blocked) return blocked;
    const updates: Record<string, unknown> = { title: parsed.data.title, priority: parsed.data.priority, estimate_minutes: parsed.data.estimateMinutes, status: parsed.data.status };
    if (parsed.data.description !== undefined) updates.description = parsed.data.description;
    const { data, error } = await supabaseAdmin.from('sprint_backlog_items').update(updates).eq('id', parsed.data.itemId).eq('owner_id', userId).select('*').single();
    if (error) return NextResponse.json({ ok: false, error: 'Unable to update backlog item.' }, { status: 409 });
    return NextResponse.json({ ok: true, backlogItem: data });
  }
  if (parsed.data.action === 'remove_sprint_item') {
    const blocked = await legacyMutationGuard(userId, 'sprint', parsed.data.sprintId);
    if (blocked) return blocked;
    const { data, error } = await supabaseAdmin.rpc('remove_sprint_item', { p_item_id: parsed.data.itemId, p_sprint_id: parsed.data.sprintId, p_owner_id: userId, p_expected_revision: parsed.data.expectedRevision });
    if (error || !data) return NextResponse.json({ ok: false, error: error?.message || 'Unable to remove sprint item.' }, { status: 409 });
    return NextResponse.json({ ok: true });
  }
  if (parsed.data.action === 'update_sprint_item') {
    const updateRequest = parsed.data;
    if (updateRequest.workerId && !intelligenceWorkers.some((worker) => worker.id === updateRequest.workerId)) {
      return NextResponse.json({ ok: false, error: 'Choose a supported worker.' }, { status: 400 });
    }
    const blocked = await legacyMutationGuard(userId, 'sprint', updateRequest.sprintId);
    if (blocked) return blocked;
    const { data, error } = await supabaseAdmin.rpc('update_proposed_sprint_item', {
      p_item_id: updateRequest.itemId,
      p_sprint_id: updateRequest.sprintId,
      p_owner_id: userId,
      p_expected_sprint_revision: updateRequest.expectedSprintRevision,
      p_title: updateRequest.title,
      p_description: updateRequest.description,
      p_priority: updateRequest.priority,
      p_estimate_minutes: updateRequest.estimateMinutes,
      p_worker_id: updateRequest.workerId,
    });
    if (error || !data) return NextResponse.json({ ok: false, error: error?.message || 'Unable to update proposed sprint item.' }, { status: 409 });
    return NextResponse.json({ ok: true, update: data?.[0] || null });
  }
  if (parsed.data.action === 'complete_assignment') {
    const blocked = await legacyMutationGuard(userId, 'assignment', parsed.data.assignmentId);
    if (blocked) return blocked;
    const { data, error } = await supabaseAdmin.rpc('complete_sprint_assignment', { p_assignment_id: parsed.data.assignmentId, p_owner_id: userId });
    if (error || !data) return NextResponse.json({ ok: false, error: error?.message || 'Unable to complete assignment.' }, { status: 409 });
    return NextResponse.json({ ok: true, assignmentId: parsed.data.assignmentId });
  }
  const { data: sprint, error } = await supabaseAdmin.from('sprints').insert({ owner_id: userId, name: parsed.data.name, goal: parsed.data.goal, starts_at: parsed.data.startsAt, ends_at: parsed.data.endsAt }).select('*').single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  if (parsed.data.items.length) {
    const { error: itemError } = await supabaseAdmin.from('sprint_items').insert(parsed.data.items.map((entry) => ({ sprint_id: sprint.id, owner_id: userId, title: entry.title, description: entry.description, priority: entry.priority, estimate_minutes: entry.estimateMinutes })));
    if (itemError) return NextResponse.json({ ok: false, error: itemError.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, sprint }, { status: 201 });
}
