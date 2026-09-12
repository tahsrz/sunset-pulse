import { NextRequest, NextResponse } from 'next/server';
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
});
const agentDraftSchema = z.object({
  action: z.literal('save_agent_draft'),
  subject: z.string().trim().min(1).max(300),
  body: z.string().trim().min(1).max(12000),
  sourceRunId: uuid.optional(),
});
const requestSchema = z.discriminatedUnion('action', [saveSettingsSchema, runSchema, sendSchema, agentDraftSchema]);

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
};

export async function GET(request: NextRequest) {
  const access = await requireOperatorRouteAccess(request);
  if (isAuthResponse(access)) return access;

  const audit = operatorAuditUser(access);
  const userId = uuid.safeParse(audit.userId).success ? audit.userId : null;
  const [settings, runs] = await Promise.all([loadSettings(userId), loadRuns(userId)]);
  return successResponse({
    endpoint: '/api/admin/automations/hotlist-email',
    settings,
    runs,
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
    });
    if (error) return errorResponse('Failed to save the licensed workflow profile.', 500, error.message);
    return successResponse({ saved: true, profile: redactProfile(profile) });
  }

  if (parsed.data.action === 'save_agent_draft') {
    try {
      const profile = await loadSettings(userId);
      if (!profile) return errorResponse('Save a complete licensed agent profile before saving an agent email.', 409);
      const draft = buildAgentEmailDraft({ profile, subject: parsed.data.subject, body: parsed.data.body, contacts: await loadContacts(userId) });
      const existing = await findRun(draft.fingerprint);
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

  const run = await getRun(parsed.data.runId);
  if (!run) return errorResponse('Workflow run not found.', 404);
  if (userId && run.user_id && run.user_id !== userId) return errorResponse('Workflow run is outside the current operator scope.', 403);
  const profile = await loadSettings(userId || run.user_id);
  if (!profile) return errorResponse('The licensed workflow profile is no longer available.', 409);
  if (!profile.enabled) return errorResponse('Enable the workflow profile before sending.', 409);
  if (run.status === 'sent') return successResponse({ run: presentRun(run), reused: true });
  if (run.status !== 'draft') return errorResponse(`This workflow run is ${run.status} and cannot be sent.`, 409);

  try {
    const sent = await sendRun(run, profile, auditName);
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
  const existing = await findRun(draft.fingerprint);
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
  let query = supabaseAdmin.from('licensed_workflow_runs').select('*').eq('workflow_key', 'hotlist_email').order('created_at', { ascending: false }).limit(20);
  if (userId) query = query.eq('user_id', userId);
  const { data, error } = await query;
  if (error && !isMissingWorkflowTableError(error)) console.warn('[LICENSED_WORKFLOW_RUNS_READ]', error.message);
  return ((data || []) as WorkflowRunRow[]).map(presentRun);
}

async function findRun(idempotencyKey: string) {
  const { data, error } = await supabaseAdmin.from('licensed_workflow_runs').select('*').eq('idempotency_key', idempotencyKey).maybeSingle();
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
    approved_by_name: auditName,
  }).select('*').single();
  if (error) throw new Error(`Unable to persist workflow draft: ${error.message}`);
  return data as WorkflowRunRow;
}

async function getRun(id: string) {
  const { data, error } = await supabaseAdmin.from('licensed_workflow_runs').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(`Unable to load workflow run: ${error.message}`);
  return data as WorkflowRunRow | null;
}

async function sendRun(run: WorkflowRunRow, profile: LicensedWorkflowProfile, auditName: string) {
  const { data: claimed, error: claimError } = await supabaseAdmin.from('licensed_workflow_runs')
    .update({ status: 'sending', approved_at: new Date().toISOString(), approved_by_name: auditName, error: null })
    .eq('id', run.id)
    .eq('status', 'draft')
    .select('*')
    .maybeSingle();
  if (claimError) throw new Error(`Unable to claim workflow run: ${claimError.message}`);
  if (!claimed) {
    const latest = await getRun(run.id);
    if (latest?.status === 'sent') return latest;
    throw new Error('This workflow run is already being processed or is no longer sendable.');
  }

  try {
    const recipients = readRecipients(claimed.recipient_snapshot);
    const result = await sendLicensedHotlistEmail({
      recipients,
      subject: claimed.subject,
      body: claimed.body,
      replyTo: profile.replyToEmail,
      idempotencyKey: claimed.idempotency_key,
    });
    const { data: sent, error } = await supabaseAdmin.from('licensed_workflow_runs').update({
      status: 'sent',
      sent_at: new Date().toISOString(),
      provider_message_id: result.id,
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
  };
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
