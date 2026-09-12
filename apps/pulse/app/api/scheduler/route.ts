import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { isAuthResponse, operatorAuditUser, requireOperatorRouteAccess } from '@/lib/core/routeAuth';
import { canCancelJob } from '@/lib/autonomous-workflows/schedulerTransitions';

const requestSchema = z.object({ action: z.enum(['pause', 'resume', 'cancel_job']), id: z.string().uuid() });

export async function GET(request: NextRequest) {
  const access = await requireOperatorRouteAccess(request);
  if (isAuthResponse(access)) return access;
  const userId = operatorAuditUser(access).userId;
  if (!z.string().uuid().safeParse(userId).success) return NextResponse.json({ ok: false, error: 'A signed-in user is required.' }, { status: 401 });
  const [{ data: schedules, error: scheduleError }, { data: jobs, error: jobError }] = await Promise.all([
    supabaseAdmin.from('workflow_schedules').select('id,workflow_key,enabled,cadence,time_zone,next_run_at').eq('user_id', userId).order('next_run_at'),
    supabaseAdmin.from('workflow_jobs').select('id,schedule_id,workflow_key,scheduled_for,status,attempts,lease_until,result_id,error').eq('user_id', userId).order('scheduled_for', { ascending: false }).limit(100),
  ]);
  if (scheduleError || jobError) return NextResponse.json({ ok: false, error: scheduleError?.message || jobError?.message }, { status: 500 });
  return NextResponse.json({ ok: true, schedules: schedules || [], jobs: jobs || [] });
}

export async function POST(request: NextRequest) {
  const access = await requireOperatorRouteAccess(request);
  if (isAuthResponse(access)) return access;
  const userId = operatorAuditUser(access).userId;
  if (!z.string().uuid().safeParse(userId).success) return NextResponse.json({ ok: false, error: 'A signed-in user is required.' }, { status: 401 });
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: 'Invalid scheduler request.' }, { status: 400 });
  const { action, id } = parsed.data;
  if (action === 'cancel_job') {
    const { data: currentJob } = await supabaseAdmin.from('workflow_jobs').select('status').eq('id', id).eq('user_id', userId).maybeSingle();
    if (!currentJob || !canCancelJob(currentJob.status)) return NextResponse.json({ ok: false, error: 'Job is not cancellable.' }, { status: 409 });
    const { data, error } = await supabaseAdmin.from('workflow_jobs').update({ status: 'cancelled', lease_until: null }).eq('id', id).eq('user_id', userId).in('status', ['queued', 'running']).select('id,status').maybeSingle();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ ok: false, error: 'Job not found or already finished.' }, { status: 409 });
    return NextResponse.json({ ok: true, job: data });
  }
  const functionName = action === 'pause' ? 'pause_workflow_schedule' : 'resume_workflow_schedule';
  const { data, error } = await supabaseAdmin.rpc(functionName, { p_schedule_id: id, p_user_id: userId });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ ok: false, error: 'Schedule not found.' }, { status: 404 });
  return NextResponse.json({ ok: true, scheduleId: id, status: action === 'pause' ? 'paused' : 'active' });
}
