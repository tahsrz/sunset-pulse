import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { isAuthResponse, requireSignedInUser } from '@/lib/core/routeAuth';

const requestSchema = z.object({ action: z.enum(['pause', 'resume', 'cancel_job']), id: z.string().uuid() });

export async function GET(request: NextRequest) {
  const access = await requireSignedInUser(request);
  if (isAuthResponse(access)) return access;
  const userId = access.user.id;
  if (!z.string().uuid().safeParse(userId).success) return NextResponse.json({ ok: false, error: 'A signed-in user is required.' }, { status: 401 });
  const [{ data: schedules, error: scheduleError }, { data: jobs, error: jobError }] = await Promise.all([
    supabaseAdmin.from('workflow_schedules').select('id,workflow_key,planning_mode,enabled,cadence,time_zone,local_hour,local_minute,local_weekday,next_run_at,revision').eq('user_id', userId).order('next_run_at'),
    supabaseAdmin.from('workflow_jobs').select('id,schedule_id,workflow_key,scheduled_for,status,attempts,lease_until,result_id,error').eq('user_id', userId).order('scheduled_for', { ascending: false }).limit(100),
  ]);
  if (scheduleError || jobError) return NextResponse.json({ ok: false, error: scheduleError?.message || jobError?.message }, { status: 500 });
  return NextResponse.json({ ok: true, schedules: schedules || [], jobs: jobs || [] });
}

export async function POST(request: NextRequest) {
  const access = await requireSignedInUser(request);
  if (isAuthResponse(access)) return access;
  const userId = access.user.id;
  if (!z.string().uuid().safeParse(userId).success) return NextResponse.json({ ok: false, error: 'A signed-in user is required.' }, { status: 401 });
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: 'Invalid scheduler request.' }, { status: 400 });
  const { action, id } = parsed.data;
  if (action === 'cancel_job') {
    // The RPC clears the lease token. A running worker may finish an external
    // provider action, but it cannot overwrite the cancelled local job receipt.
    const { data, error } = await supabaseAdmin.rpc('cancel_workflow_job', { p_job_id: id, p_user_id: userId });
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ ok: false, error: 'Job not found or already finished.' }, { status: 409 });
    return NextResponse.json({ ok: true, job: { id, status: 'cancelled' } });
  }
  const functionName = action === 'pause' ? 'pause_workflow_schedule' : 'resume_workflow_schedule';
  const { data, error } = await supabaseAdmin.rpc(functionName, { p_schedule_id: id, p_user_id: userId });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ ok: false, error: 'Schedule not found.' }, { status: 404 });
  return NextResponse.json({ ok: true, scheduleId: id, status: action === 'pause' ? 'paused' : 'active' });
}
