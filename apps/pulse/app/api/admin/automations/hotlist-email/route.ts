import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { errorResponse, successResponse } from '@/lib/core/apiResponse';
import { isAuthResponse, operatorAuditUser, requireOperatorRouteAccess } from '@/lib/core/routeAuth';
import { supabaseAdmin } from '@/lib/supabase';
import { getTourHotList } from '@/lib/data/tourHotList';
import {
  buildAgentEmailDraft,
  buildHotlistEmailDraft,
  HotlistWorkflowError,
  licensedWorkflowProfileSchema,
  type LicensedWorkflowProfile,
} from '@/lib/autonomous-workflows/hotlistEmail';
import { EmailProviderNotConfiguredError, sendLicensedHotlistEmail } from '@/lib/autonomous-workflows/emailSender.server';
import { chunk } from '@/lib/autonomous-workflows/deliveryBatching';
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

type WorkflowRunRow = {
  id: string;
  user_id: string | null;
  workflow_key: 'hotlist_email' | 'agent_email';
  status: 'draft' | 'sending' | 'sent' | 'failed' | 'cancelled';
  idempotency_key: string;
  subject: string;
  body: string;
  listing_snapshot: unknown;
  recipient_snapshot: unknown;
  skipped_snapshot: unknown;
  approval_required: boolean;
  approved_at: string | null;
  approved_by_name: string | null;
  sent_at: string | null;
  provider_message_id: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
  revision: number;
  audience_hash: string;
};

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

export async function runHotlistEmailForUser({
  userId,
  auditName,
  confirmAutoSend,
}: {
  userId: string | null;
  auditName: string;
  confirmAutoSend: boolean;
}) {
  const profile = await loadSettings(userId);
  if (!profile) throw new HotlistWorkflowError('Save a complete licensed agent profile before running this workflow.', 'profile_incomplete');
  if (!profile.enabled) throw new HotlistWorkflowError('Enable the workflow profile before running it.', 'disabled');
  const [hotlist, contacts] = await Promise.all([getTourHotList({ limit: 24 }), loadContacts(userId)]);
  const draft = buildHotlistEmailDraft({ profile, listings: hotlist.listings, contacts });
   const existing = await findRun(draft.fingerprint, userId);
  if (existing) return { run: existing, reused: true, autoSent: false };
  const inserted = await insertRun({ userId, draft, auditName });
  if (profile.autoSend && confirmAutoSend) return { run: await sendRun(inserted, profile, auditName), reused: false, autoSent: true };
  return { run: inserted, reused: false, autoSent: false };
}

async function loadSettings(userId: string | null): Promise<LicensedWorkflowProfile | null> {
  if (userId) {
    const { data, error } = await supabaseAdmin.from('licensed_workflow_settings').select('*').eq('user_id', userId).maybeSingle();
    if (!error && data) return profileFromRow(data);
    if (error && !isMissingWorkflowTableError(error)) console.warn('[LICENSED_WORKFLOW_SETTINGS_READ]', error.message);
  }

  const envProfile = licensedWorkflowProfileSchema.safeParse({
    agentName: process.env.SUNSET_PULSE_WORKFLOW_AGENT_NAME,
    brokerageName: process.env.SUNSET_PULSE_WORKFLOW_BROKERAGE_NAME,
    licenseNumber: process.env.SUNSET_PULSE_WORKFLOW_LICENSE_NUMBER,
    jurisdiction: process.env.SUNSET_PULSE_WORKFLOW_JURISDICTION,
    serviceArea: process.env.SUNSET_PULSE_WORKFLOW_SERVICE_AREA,
    replyToEmail: process.env.SUNSET_PULSE_WORKFLOW_REPLY_TO,
    disclosureText: process.env.SUNSET_PULSE_WORKFLOW_DISCLOSURE,
    enabled: process.env.SUNSET_PULSE_WORKFLOW_ENABLED === 'true',
    autoSend: process.env.SUNSET_PULSE_WORKFLOW_AUTO_SEND === 'true',
    maxRecipientsPerRun: Number(process.env.SUNSET_PULSE_WORKFLOW_MAX_RECIPIENTS || 25),
    cadence: process.env.SUNSET_PULSE_WORKFLOW_CADENCE || 'daily',
    timeZone: process.env.SUNSET_PULSE_WORKFLOW_TIME_ZONE || 'America/Chicago',
    localHour: Number(process.env.SUNSET_PULSE_WORKFLOW_LOCAL_HOUR || 8),
    localMinute: Number(process.env.SUNSET_PULSE_WORKFLOW_LOCAL_MINUTE || 0),
  });
  return envProfile.success ? envProfile.data : null;
}

function profileFromRow(row: Record<string, unknown>): LicensedWorkflowProfile {
  return licensedWorkflowProfileSchema.parse({
    agentName: row.agent_name,
    brokerageName: row.brokerage_name,
    licenseNumber: row.license_number,
    jurisdiction: row.jurisdiction,
    serviceArea: row.service_area,
    replyToEmail: row.reply_to_email,
    disclosureText: row.disclosure_text,
    enabled: row.enabled,
    autoSend: row.auto_send,
    maxRecipientsPerRun: row.max_recipients_per_run,
    cadence: row.cadence || 'daily',
    timeZone: row.time_zone || 'America/Chicago',
    localHour: Number(row.local_hour ?? 8),
    localMinute: Number(row.local_minute ?? 0),
  });
}

async function loadContacts(userId: string | null) {
  let query = supabaseAdmin.from('leads').select('id, name, first_name, last_name, email, do_not_contact, metadata').limit(500);
  if (userId) query = query.or(`assigned_to.eq.${userId},assigned_to.is.null`);
  const { data, error } = await query;
  if (error) throw new Error(`Unable to load the operator contact list: ${error.message}`);
  return (data || []).map((contact) => ({
    ...contact,
    metadata: isRecord(contact.metadata) ? contact.metadata : null,
  }));
}

async function loadRuns(userId: string | null) {
  let query = supabaseAdmin.from('licensed_workflow_runs').select('*').in('workflow_key', ['hotlist_email', 'agent_email']).order('created_at', { ascending: false }).limit(20);
  if (userId) query = query.eq('user_id', userId);
  const { data, error } = await query;
  if (error && !isMissingWorkflowTableError(error)) console.warn('[LICENSED_WORKFLOW_RUNS_READ]', error.message);
  const runs = (data || []) as WorkflowRunRow[];
  if (!runs.length) return [];
  const { data: deliveries } = await supabaseAdmin.from('workflow_deliveries').select('workflow_run_id,batch_number,status,provider_message_id,error').in('workflow_run_id', runs.map((run) => run.id)).order('batch_number');
  return runs.map((run) => ({ ...presentRun(run), deliveries: (deliveries || []).filter((delivery) => delivery.workflow_run_id === run.id).map((delivery) => ({ batchNumber: delivery.batch_number, status: delivery.status, providerMessageId: delivery.provider_message_id, error: delivery.error })) }));
}

async function findRun(idempotencyKey: string, userId: string | null) {
  if (!userId) return null;
  const { data, error } = await supabaseAdmin.from('licensed_workflow_runs').select('*').eq('idempotency_key', idempotencyKey).eq('user_id', userId).maybeSingle();
  if (error) throw new Error(`Unable to check workflow idempotency: ${error.message}`);
  return data as WorkflowRunRow | null;
}

async function insertRun({ userId, draft, auditName, workflowKey = 'hotlist_email', metadata = {} }: { userId: string | null; draft: ReturnType<typeof buildHotlistEmailDraft> | ReturnType<typeof buildAgentEmailDraft>; auditName: string; workflowKey?: 'hotlist_email' | 'agent_email'; metadata?: Record<string, unknown> }) {
  const { data, error } = await supabaseAdmin.from('licensed_workflow_runs').insert({
    user_id: userId,
    workflow_key: workflowKey,
    status: 'draft',
    idempotency_key: draft.fingerprint,
    subject: draft.subject,
    body: draft.body,
    listing_snapshot: 'listingSnapshot' in draft ? draft.listingSnapshot : [],
    recipient_snapshot: draft.recipientSnapshot,
    skipped_snapshot: { contacts: draft.skippedContacts, listings: 'skippedListings' in draft ? draft.skippedListings : [], ...metadata },
    approval_required: true,
    audience_hash: hashAudience(draft.recipientSnapshot),
  }).select('*').single();
  if (error) throw new Error(`Unable to persist workflow draft: ${error.message}`);
  return data as WorkflowRunRow;
}

async function getRun(id: string, userId: string | null) {
  if (!userId) return null;
  const { data, error } = await supabaseAdmin.from('licensed_workflow_runs').select('*').eq('id', id).eq('user_id', userId).maybeSingle();
  if (error) throw new Error(`Unable to load workflow run: ${error.message}`);
  return data as WorkflowRunRow | null;
}

async function sendRun(run: WorkflowRunRow, profile: LicensedWorkflowProfile, auditName: string, expectedRevision?: number) {
  if (expectedRevision !== undefined && expectedRevision !== run.revision) throw new Error('This draft changed after it was reviewed. Save and approve the latest revision.');
  const { data: claimed, error: claimError } = await supabaseAdmin.from('licensed_workflow_runs')
    .update({ status: 'sending', approved_at: new Date().toISOString(), approved_by_name: auditName, error: null })
    .eq('id', run.id)
    .eq('status', 'draft')
    .select('*')
    .maybeSingle();
  if (claimError) throw new Error(`Unable to claim workflow run: ${claimError.message}`);
  if (!claimed) {
    const latest = await getRun(run.id, run.user_id);
    if (latest?.status === 'sent') return latest;
    throw new Error('This workflow run is already being processed or is no longer sendable.');
  }

  try {
    const recipients = readRecipients(claimed.recipient_snapshot);
    const currentContacts = await loadContacts(claimed.user_id);
    const currentEligible = new Set(currentContacts.filter((contact) => {
      const metadata = contact.metadata || {};
      return Boolean(contact.email) && !contact.do_not_contact && metadata.email_opt_out !== true && metadata.emailOptOut !== true && (metadata.email_marketing_consent === true || metadata.emailConsent === 'subscribed');
    }).map((contact) => String(contact.email).trim().toLowerCase()));
    const removed = recipients.filter((email) => !currentEligible.has(email));
    if (removed.length) throw new Error(`Approval is stale: ${removed.length} recipient(s) no longer meet consent or contact-scope rules. Regenerate the draft before sending.`);
    const batches = chunk(recipients, 50);
    let providerMessageId: string | null = null;
    for (const [index, batch] of batches.entries()) {
      const batchNumber = index + 1;
      const batchKey = `${claimed.idempotency_key}:batch:${batchNumber}`;
      const { data: delivery, error: deliveryInsertError } = await supabaseAdmin.from('workflow_deliveries').upsert({ workflow_run_id: claimed.id, batch_number: batchNumber, recipients: batch, idempotency_key: batchKey, status: 'pending' }, { onConflict: 'workflow_run_id,batch_number', ignoreDuplicates: false }).select('*').single();
      if (deliveryInsertError) throw new Error(`Unable to persist delivery batch ${batchNumber}: ${deliveryInsertError.message}`);
      if (delivery.status === 'sent') { providerMessageId ||= delivery.provider_message_id; continue; }
      await supabaseAdmin.from('workflow_deliveries').update({ status: 'sending', error: null }).eq('id', delivery.id).eq('status', 'pending');
      try {
        const result = await sendLicensedHotlistEmail({ recipients: batch, subject: claimed.subject, body: claimed.body, replyTo: profile.replyToEmail, idempotencyKey: batchKey });
        providerMessageId ||= result.id;
        const { error: deliveryUpdateError } = await supabaseAdmin.from('workflow_deliveries').update({ status: 'sent', provider_message_id: result.id }).eq('id', delivery.id);
        if (deliveryUpdateError) throw new Error(`Batch ${batchNumber} sent but receipt could not be saved: ${deliveryUpdateError.message}`);
      } catch (batchError) {
        const message = batchError instanceof Error ? batchError.message : String(batchError);
        await supabaseAdmin.from('workflow_deliveries').update({ status: 'failed', error: message }).eq('id', delivery.id);
        throw new Error(`Delivery batch ${batchNumber} failed: ${message}`);
      }
    }
    const { data: sent, error } = await supabaseAdmin.from('licensed_workflow_runs').update({
      status: 'sent',
      sent_at: new Date().toISOString(),
      provider_message_id: providerMessageId,
    }).eq('id', claimed.id).select('*').single();
    if (error) throw new Error(`Email sent but run receipt could not be saved: ${error.message}`);
    return sent as WorkflowRunRow;
  } catch (error) {
    await supabaseAdmin.from('licensed_workflow_runs').update({
      status: 'failed',
      error: error instanceof Error ? error.message : String(error),
    }).eq('id', claimed.id);
    throw error;
  }
}

function readRecipients(value: unknown) {
  if (!Array.isArray(value)) throw new Error('Workflow recipient snapshot is invalid.');
  const recipients = value.map((item) => isRecord(item) ? String(item.email || '').trim().toLowerCase() : '').filter(Boolean);
  if (!recipients.length) throw new Error('Workflow has no eligible recipients.');
  return [...new Set(recipients)];
}


function presentRun(run: WorkflowRunRow) {
  return {
    id: run.id,
    workflowKey: run.workflow_key,
    status: run.status,
    subject: run.subject,
    body: run.body,
    listingSnapshot: run.listing_snapshot,
    recipientSnapshot: run.recipient_snapshot,
    skippedSnapshot: run.skipped_snapshot,
    approvalRequired: run.approval_required,
    approvedAt: run.approved_at,
    approvedByName: run.approved_by_name,
    sentAt: run.sent_at,
    providerMessageId: run.provider_message_id,
    error: run.error,
    createdAt: run.created_at,
    updatedAt: run.updated_at,
    revision: run.revision,
    audienceHash: run.audience_hash,
  };
}

function hashAudience(value: unknown) {
  return createHash('md5').update(JSON.stringify(value)).digest('hex');
}

function redactProfile(profile: LicensedWorkflowProfile) {
  return { ...profile, licenseNumber: profile.licenseNumber ? '••••' + profile.licenseNumber.slice(-4) : '' };
}

function workflowErrorResponse(error: unknown) {
  if (error instanceof HotlistWorkflowError) return errorResponse(error.message, error.code === 'disabled' ? 409 : 400, { code: error.code });
  if (error instanceof EmailProviderNotConfiguredError) return errorResponse(error.message, 503);
  console.error('[LICENSED_HOTLIST_WORKFLOW]', error);
  return errorResponse(error instanceof Error ? error.message : 'Licensed workflow failed.', 500);
}

function isRecord(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isMissingWorkflowTableError(error: unknown) {
  const message = isRecord(error) ? String(error.message || '') : String(error);
  return message.includes('licensed_workflow_') && (message.includes('schema cache') || message.includes('does not exist'));
}
