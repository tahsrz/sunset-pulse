import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { isAuthResponse, requireSignedInUser } from '@/lib/core/routeAuth';
import { isValidTimeZone, nextOccurrenceAfter } from '@/lib/autonomous-workflows/schedulerPolicy';

const uuid = z.string().uuid();
const item = z.object({ title: z.string().trim().min(1).max(240), description: z.string().trim().max(2000).default(''), priority: z.number().int().min(1).max(5).default(3), estimateMinutes: z.number().int().min(1).max(10080).nullable().default(null) });
const requestSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('create_schedule'), cadence: z.enum(['daily', 'weekly']), planningMode: z.enum(['manual_backlog', 'property_shortlist']).default('manual_backlog'), timeZone: z.string().trim().min(1).max(80).default('America/Chicago'), localHour: z.number().int().min(0).max(23).default(8), localMinute: z.number().int().min(0).max(59).default(0), localWeekday: z.number().int().min(1).max(7).default(1) }),
  z.object({ action: z.literal('create'), name: z.string().trim().min(1).max(160), goal: z.string().trim().min(1).max(2000), startsAt: z.string().datetime().nullable().default(null), endsAt: z.string().datetime().nullable().default(null), items: z.array(item).max(100).default([]) }),
  z.object({ action: z.literal('approve'), sprintId: uuid, expectedRevision: z.number().int().positive().nullable().default(null) }),
  z.object({ action: z.literal('remove_backlog_item'), itemId: uuid }),
  z.object({ action: z.literal('update_backlog_item'), itemId: uuid, title: z.string().trim().min(1).max(240), priority: z.number().int().min(1).max(5), estimateMinutes: z.number().int().min(1).max(10080).nullable(), status: z.enum(['open','in_progress','done','cancelled']) }),
  z.object({ action: z.literal('remove_sprint_item'), itemId: uuid }),
  z.object({ action: z.literal('complete_assignment'), assignmentId: uuid }),
  z.object({ action: z.literal('add_backlog_item'), title: z.string().trim().min(1).max(240), description: z.string().trim().max(2000).default(''), priority: z.number().int().min(1).max(5).default(3), estimateMinutes: z.number().int().min(1).nullable().default(null) }),
]);

export async function GET(request: NextRequest) {
  const access = await requireSignedInUser(request);
  if (isAuthResponse(access)) return access;
  const userId = access.user.id;
  if (!uuid.safeParse(userId).success) return NextResponse.json({ ok: false, error: 'A signed-in user is required.' }, { status: 401 });
  const { data: sprints, error } = await supabaseAdmin.from('sprints').select('*').eq('owner_id', userId).order('created_at', { ascending: false }).limit(50);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  const { data: items } = await supabaseAdmin.from('sprint_items').select('*').eq('owner_id', userId).order('priority').limit(500);
  const { data: assignments } = await supabaseAdmin.from('agent_assignments').select('*').eq('owner_id', userId).order('created_at', { ascending: false }).limit(500);
  const { data: backlog } = await supabaseAdmin.from('sprint_backlog_items').select('*').eq('owner_id', userId).order('priority').limit(500);
  const { data: schedules, error: scheduleError } = await supabaseAdmin.from('workflow_schedules').select('id,workflow_key,planning_mode,enabled,cadence,time_zone,local_hour,local_minute,local_weekday,next_run_at').eq('user_id', userId).eq('workflow_key', 'sprint_planner');
  if (scheduleError) return NextResponse.json({ ok: false, error: scheduleError.message }, { status: 500 });
  return NextResponse.json({ ok: true, sprints: sprints || [], items: items || [], assignments: assignments || [], backlog: backlog || [], schedules: schedules || [] });
}

export async function POST(request: NextRequest) {
  const access = await requireSignedInUser(request);
  if (isAuthResponse(access)) return access;
  const userId = access.user.id;
  if (!uuid.safeParse(userId).success) return NextResponse.json({ ok: false, error: 'A signed-in user is required.' }, { status: 401 });
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: 'Invalid sprint request.', details: parsed.error.flatten() }, { status: 400 });
  if (parsed.data.action === 'create_schedule' && !isValidTimeZone(parsed.data.timeZone)) return NextResponse.json({ ok: false, error: 'Invalid timezone identifier.' }, { status: 400 });

  if (parsed.data.action === 'create_schedule') {
    const nextRunAt = nextOccurrenceAfter(new Date(), { cadence: parsed.data.cadence, timeZone: parsed.data.timeZone, localHour: parsed.data.localHour, localMinute: parsed.data.localMinute, localWeekday: parsed.data.localWeekday });
    const { data, error } = await supabaseAdmin.from('workflow_schedules').upsert({ user_id: userId, workflow_key: 'sprint_planner', planning_mode: parsed.data.planningMode, cadence: parsed.data.cadence, time_zone: parsed.data.timeZone, local_hour: parsed.data.localHour, local_minute: parsed.data.localMinute, local_weekday: parsed.data.localWeekday, enabled: true, next_run_at: nextRunAt }, { onConflict: 'user_id,workflow_key' }).select('*').single();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, schedule: data });
  }
  if (parsed.data.action === 'approve') {
    const { data, error } = await supabaseAdmin.rpc('approve_sprint_with_assignments', { p_sprint_id: parsed.data.sprintId, p_owner_id: userId, p_expected_revision: parsed.data.expectedRevision });
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 409 });
    return NextResponse.json({ ok: true, approval: data?.[0] || null });
  }
  if (parsed.data.action === 'add_backlog_item') {
    const { data, error } = await supabaseAdmin.from('sprint_backlog_items').insert({ owner_id: userId, title: parsed.data.title, description: parsed.data.description, priority: parsed.data.priority, estimate_minutes: parsed.data.estimateMinutes, source_type: 'manual' }).select('*').single();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, backlogItem: data }, { status: 201 });
  }
  if (parsed.data.action === 'remove_backlog_item') {
    const { error } = await supabaseAdmin.from('sprint_backlog_items').update({ status: 'cancelled' }).eq('id', parsed.data.itemId).eq('owner_id', userId).eq('status', 'open');
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }
  if (parsed.data.action === 'update_backlog_item') {
    const { data, error } = await supabaseAdmin.from('sprint_backlog_items').update({ title: parsed.data.title, priority: parsed.data.priority, estimate_minutes: parsed.data.estimateMinutes, status: parsed.data.status }).eq('id', parsed.data.itemId).eq('owner_id', userId).select('*').single();
    if (error) return NextResponse.json({ ok: false, error: 'Unable to update backlog item.' }, { status: 409 });
    return NextResponse.json({ ok: true, backlogItem: data });
  }
  if (parsed.data.action === 'remove_sprint_item') {
    const { data: itemRow } = await supabaseAdmin.from('sprint_items').select('sprint_id').eq('id', parsed.data.itemId).eq('owner_id', userId).maybeSingle();
    if (!itemRow) return NextResponse.json({ ok: false, error: 'Sprint item not found.' }, { status: 404 });
    const { data: sprint } = await supabaseAdmin.from('sprints').select('status').eq('id', itemRow.sprint_id).eq('owner_id', userId).maybeSingle();
    if (sprint?.status !== 'proposed') return NextResponse.json({ ok: false, error: 'Only proposed sprint items can be removed.' }, { status: 409 });
    const { error } = await supabaseAdmin.from('sprint_items').update({ status: 'cancelled' }).eq('id', parsed.data.itemId).eq('owner_id', userId);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }
  if (parsed.data.action === 'complete_assignment') {
    const { data: assignment } = await supabaseAdmin.from('agent_assignments').select('id,sprint_item_id').eq('id', parsed.data.assignmentId).eq('owner_id', userId).maybeSingle();
    if (!assignment) return NextResponse.json({ ok: false, error: 'Assignment not found.' }, { status: 404 });
    const { data: sprintItem } = await supabaseAdmin.from('sprint_items').select('id,backlog_item_id').eq('id', assignment.sprint_item_id).eq('owner_id', userId).maybeSingle();
    if (!sprintItem) return NextResponse.json({ ok: false, error: 'Sprint item not found.' }, { status: 404 });
    const { error } = await supabaseAdmin.from('agent_assignments').update({ status: 'completed', updated_at: new Date().toISOString() }).eq('id', assignment.id).eq('owner_id', userId);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    await supabaseAdmin.from('sprint_items').update({ status: 'done' }).eq('id', sprintItem.id).eq('owner_id', userId);
    if (sprintItem.backlog_item_id) await supabaseAdmin.from('sprint_backlog_items').update({ status: 'done' }).eq('id', sprintItem.backlog_item_id).eq('owner_id', userId);
    return NextResponse.json({ ok: true, assignmentId: assignment.id });
  }
  const { data: sprint, error } = await supabaseAdmin.from('sprints').insert({ owner_id: userId, name: parsed.data.name, goal: parsed.data.goal, starts_at: parsed.data.startsAt, ends_at: parsed.data.endsAt }).select('*').single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  if (parsed.data.items.length) {
    const { error: itemError } = await supabaseAdmin.from('sprint_items').insert(parsed.data.items.map((entry) => ({ sprint_id: sprint.id, owner_id: userId, title: entry.title, description: entry.description, priority: entry.priority, estimate_minutes: entry.estimateMinutes })));
    if (itemError) return NextResponse.json({ ok: false, error: itemError.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, sprint }, { status: 201 });
}
