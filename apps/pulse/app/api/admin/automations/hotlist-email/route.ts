import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { errorResponse, successResponse } from '@/lib/core/apiResponse';
import { isAuthResponse, operatorAuditUser, requireOperatorRouteAccess } from '@/lib/core/routeAuth';
import { supabaseAdmin } from '@/lib/supabase';
import {
  buildAgentEmailDraft,
  HotlistWorkflowError,
  licensedWorkflowProfileSchema,
} from '@/lib/autonomous-workflows/hotlistEmail';
import { EmailProviderNotConfiguredError } from '@/lib/autonomous-workflows/emailSender.server';
import {
  findRun,
  getRun,
  insertRun,
  loadContacts,
  loadRuns,
  loadSettings,
  presentRun,
  redactProfile,
  runHotlistEmailForUser,
  sendRun,
  type WorkflowRunRow,
} from '@/lib/autonomous-workflows/hotlistEmailWorkflow.server';
import { isValidTimeZone } from '@/lib/autonomous-workflows/schedulerPolicy';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const uuid = z.string().uuid();
const saveSettingsSchema = licensedWorkflowProfileSchema.extend({ action: z.literal('save_settings') });
const runSchema = z.object({
  action: z.literal('run'),
  confirmAutoSend: z.boolean().optional().default(false),
});
const sendSchema = z.object({
  action: z.literal('send'),
  runId: uuid,
  confirm: z.literal(true),
  expectedRevision: z.number().int().positive().optional(),
});
const retrySchema = z.object({ action: z.literal('retry_failed'), runId: uuid, confirm: z.literal(true) });
const rejectSchema = z.object({ action: z.literal('reject'), runId: uuid, reason: z.string().trim().max(500).optional() });
const updateDraftSchema = z.object({ action: z.literal('update_draft'), runId: uuid, subject: z.string().trim().min(1).max(300), body: z.string().trim().min(1).max(12000), expectedRevision: z.number().int().positive() });
const agentDraftSchema = z.object({
  action: z.literal('save_agent_draft'),
  subject: z.string().trim().min(1).max(300),
  body: z.string().trim().min(1).max(12000),
  sourceRunId: uuid.optional(),
});
const requestSchema = z.discriminatedUnion('action', [saveSettingsSchema, runSchema, sendSchema, retrySchema, rejectSchema, updateDraftSchema, agentDraftSchema]);

export async function GET(request: NextRequest) {
  const access = await requireOperatorRouteAccess(request);
  if (isAuthResponse(access)) return access;

  const audit = operatorAuditUser(access);
  const userId = uuid.safeParse(audit.userId).success ? audit.userId : null;
  const [settings, runs] = await Promise.all([loadSettings(userId), loadRuns(userId)]);
  const { data: schedules } = await supabaseAdmin.from('workflow_schedules').select('id,enabled,cadence,time_zone,next_run_at').eq('user_id', userId || '').eq('workflow_key', 'hotlist_email');
  return successResponse({
    endpoint: '/api/admin/automations/hotlist-email',
    settings,
    runs,
    schedules: schedules || [],
    safety: {
      contactRule: 'Only contacts with explicit email consent are eligible; do-not-contact and opt-out records are excluded.',
      approvalRule: 'Every external send requires an explicit approval confirmation.',
      transactionBoundary: 'This workflow does not make offers, negotiate, sign contracts, publish MLS changes, or move money.',
    },
  });
}

export async function POST(request: NextRequest) {
  const access = await requireOperatorRouteAccess(request);
  if (isAuthResponse(access)) return access;

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return errorResponse('Invalid licensed workflow request.', 400, parsed.error.flatten());
  if (parsed.data.action === 'save_settings' && !isValidTimeZone(parsed.data.timeZone)) return errorResponse('Invalid timezone identifier.', 400);

  const audit = operatorAuditUser(access);
  const userId = uuid.safeParse(audit.userId).success ? audit.userId : null;
  const auditName = audit.name || audit.email || 'Operator';

  if (parsed.data.action === 'save_settings') {
    if (!userId) return errorResponse('A signed-in operator is required to save the licensed workflow profile.', 400);
    const { action: _action, ...profile } = parsed.data;
    const { error } = await supabaseAdmin.from('licensed_workflow_settings').upsert({
      user_id: userId,
      agent_name: profile.agentName,
      brokerage_name: profile.brokerageName,
      license_number: profile.licenseNumber,
      jurisdiction: profile.jurisdiction,
      service_area: profile.serviceArea,
      reply_to_email: profile.replyToEmail,
      disclosure_text: profile.disclosureText,
      enabled: profile.enabled,
      auto_send: profile.autoSend,
      audience_scope: profile.audienceScope,
      auto_send_policy_version: 1,
      max_recipients_per_run: profile.maxRecipientsPerRun,
      cadence: profile.cadence,
      time_zone: profile.timeZone,
      local_hour: profile.localHour,
      local_minute: profile.localMinute,
    });
    if (error) return errorResponse('Failed to save the licensed workflow profile.', 500, error.message);
    const { error: scheduleError } = await supabaseAdmin.from('workflow_schedules').upsert({
      user_id: userId,
      workflow_key: 'hotlist_email',
      enabled: profile.enabled,
      cadence: profile.cadence,
      time_zone: profile.timeZone,
      next_run_at: new Date().toISOString(),
    }, { onConflict: 'user_id,workflow_key' });
    if (scheduleError) return errorResponse('Profile saved, but the workflow schedule could not be saved.', 500, scheduleError.message);
    return successResponse({ saved: true, profile: redactProfile(profile) });
  }

  if (parsed.data.action === 'save_agent_draft') {
    if (!userId) return errorResponse('A signed-in operator is required to save an agent email.', 401);
    try {
      const profile = await loadSettings(userId);
      if (!profile) return errorResponse('Save a complete licensed agent profile before saving an agent email.', 409);
      const draft = buildAgentEmailDraft({ profile, subject: parsed.data.subject, body: parsed.data.body, contacts: await loadContacts(userId) });
      const existing = await findRun(draft.fingerprint, userId);
      if (existing) return successResponse({ run: presentRun(existing), reused: true });
      const run = await insertRun({ userId, draft, auditName, workflowKey: 'agent_email', metadata: { sourceRunId: parsed.data.sourceRunId || null } });
      return NextResponse.json({ success: true, data: { run: presentRun(run), requiresApproval: true } }, { status: 201 });
    } catch (error) {
      return workflowErrorResponse(error);
    }
  }

  if (parsed.data.action === 'run') {
    try {
      const result = await runHotlistEmailForUser({ userId, auditName, confirmAutoSend: parsed.data.confirmAutoSend });
      if (result.reused) return successResponse({ run: presentRun(result.run), reused: true });
      if (result.autoSent) return successResponse({ run: presentRun(result.run), autoSent: true });
      return NextResponse.json({ success: true, data: { run: presentRun(result.run), requiresApproval: true } }, { status: 201 });
    } catch (error) {
      return workflowErrorResponse(error);
    }
  }

  const run = await getRun(parsed.data.runId, userId);
  if (!run) return errorResponse('Workflow run not found.', 404);
  if (!userId || run.user_id !== userId) return errorResponse('Workflow run is outside the current operator scope.', 403);
  const profile = await loadSettings(userId || run.user_id);
  if (!profile) return errorResponse('The licensed workflow profile is no longer available.', 409);
  if (!profile.enabled) return errorResponse('Enable the workflow profile before sending.', 409);
  if (parsed.data.action === 'retry_failed') {
    if (run.status !== 'failed') return errorResponse(`This workflow run is ${run.status}; only failed runs can be retried.`, 409);
    const { error: resetError } = await supabaseAdmin.from('workflow_deliveries').update({ status: 'pending', error: null }).eq('workflow_run_id', run.id).eq('status', 'failed');
    if (resetError) return errorResponse('Unable to reset failed delivery batches.', 500, resetError.message);
    const { data: resetRun, error: runResetError } = await supabaseAdmin.from('licensed_workflow_runs').update({ status: 'draft', error: null }).eq('id', run.id).eq('status', 'failed').select('*').single();
    if (runResetError) return errorResponse('Unable to reopen failed workflow run.', 500, runResetError.message);
    const retried = await sendRun(resetRun as WorkflowRunRow, profile, auditName, resetRun.revision);
    return successResponse({ run: presentRun(retried), retried: true });
  }
  if (parsed.data.action === 'update_draft') {
    if (run.status !== 'draft') return errorResponse(`This workflow run is ${run.status} and cannot be edited.`, 409);
    if (run.revision !== parsed.data.expectedRevision) return errorResponse('This draft changed while you were editing. Reload the latest version.', 409);
    const revision = run.revision + 1;
    const idempotencyKey = createHash('sha256').update(JSON.stringify({ workflow: run.workflow_key, subject: parsed.data.subject, body: parsed.data.body, audience: run.audience_hash, revision })).digest('hex');
    const { data: updated, error: updateError } = await supabaseAdmin.from('licensed_workflow_runs').update({ subject: parsed.data.subject, body: parsed.data.body, revision, idempotency_key: idempotencyKey, approved_at: null, approved_by_name: null, error: null }).eq('id', run.id).eq('status', 'draft').eq('revision', parsed.data.expectedRevision).select('*').single();
    if (updateError) return errorResponse('Unable to save the revised workflow draft.', 500, updateError.message);
    return successResponse({ run: presentRun(updated as WorkflowRunRow) });
  }
  if (parsed.data.action === 'reject') {
    if (run.status !== 'draft') return errorResponse(`This workflow run is ${run.status} and cannot be rejected.`, 409);
    const { data: rejected, error: rejectError } = await supabaseAdmin.from('licensed_workflow_runs').update({ status: 'cancelled', error: parsed.data.reason || 'Rejected during supervisor review.' }).eq('id', run.id).eq('status', 'draft').select('*').single();
    if (rejectError) return errorResponse('Unable to reject workflow draft.', 500, rejectError.message);
    return successResponse({ run: presentRun(rejected as WorkflowRunRow) });
  }
  if (run.status === 'sent') return successResponse({ run: presentRun(run), reused: true });
  if (run.status !== 'draft') return errorResponse(`This workflow run is ${run.status} and cannot be sent.`, 409);

  try {
    const sent = await sendRun(run, profile, auditName, parsed.data.expectedRevision);
    return successResponse({ run: presentRun(sent) });
  } catch (error) {
    return workflowErrorResponse(error);
  }
}

function workflowErrorResponse(error: unknown) {
  if (error instanceof HotlistWorkflowError) return errorResponse(error.message, error.code === 'disabled' ? 409 : 400, { code: error.code });
  if (error instanceof EmailProviderNotConfiguredError) return errorResponse(error.message, 503);
  console.error('[LICENSED_HOTLIST_WORKFLOW]', error);
  return errorResponse(error instanceof Error ? error.message : 'Licensed workflow failed.', 500);
}
