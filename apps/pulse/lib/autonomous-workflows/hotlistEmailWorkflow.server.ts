import { createHash } from 'node:crypto';
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
import { supabaseAdmin } from '@/lib/supabase';

export type WorkflowRunRow = {
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

export async function runHotlistEmailForUser({
  userId,
  auditName,
  confirmAutoSend,
  retryFailed = false,
}: {
  userId: string | null;
  auditName: string;
  confirmAutoSend: boolean;
  retryFailed?: boolean;
}) {
  const profile = await loadSettings(userId);
  if (!profile) throw new HotlistWorkflowError('Save a complete licensed agent profile before running this workflow.', 'profile_incomplete');
  if (!profile.enabled) throw new HotlistWorkflowError('Enable the workflow profile before running it.', 'disabled');
  const [hotlist, contacts] = await Promise.all([getTourHotList({ limit: 24 }), loadContacts(userId)]);
  const draft = buildHotlistEmailDraft({ profile, listings: hotlist.listings, contacts });
  const existing = await findRun(draft.fingerprint, userId);
  if (existing?.status === 'failed' && retryFailed) {
    const { error: resetDeliveryError } = await supabaseAdmin.from('workflow_deliveries')
      .update({ status: 'pending', error: null })
      .eq('workflow_run_id', existing.id)
      .eq('status', 'failed');
    if (resetDeliveryError) throw new Error(`Unable to reset failed delivery batches: ${resetDeliveryError.message}`);
    const { data: resetRun, error: resetRunError } = await supabaseAdmin.from('licensed_workflow_runs')
      .update({ status: 'draft', error: null })
      .eq('id', existing.id)
      .eq('status', 'failed')
      .select('*')
      .single();
    if (resetRunError) throw new Error(`Unable to reopen failed workflow run: ${resetRunError.message}`);
    if (profile.autoSend && confirmAutoSend) return { run: await sendRun(resetRun as WorkflowRunRow, profile, auditName), reused: false, autoSent: true };
    return { run: resetRun as WorkflowRunRow, reused: false, autoSent: false };
  }
  if (existing) return { run: existing, reused: true, autoSent: false };
  const inserted = await insertRun({ userId, draft, auditName });
  if (profile.autoSend && confirmAutoSend) return { run: await sendRun(inserted, profile, auditName), reused: false, autoSent: true };
  return { run: inserted, reused: false, autoSent: false };
}

export async function loadSettings(userId: string | null): Promise<LicensedWorkflowProfile | null> {
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
    audienceScope: 'owned_hotlist_contacts',
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
    audienceScope: row.audience_scope || 'owned_hotlist_contacts',
    maxRecipientsPerRun: row.max_recipients_per_run,
    cadence: row.cadence || 'daily',
    timeZone: row.time_zone || 'America/Chicago',
    localHour: Number(row.local_hour ?? 8),
    localMinute: Number(row.local_minute ?? 0),
  });
}

export async function loadContacts(userId: string | null) {
  let query = supabaseAdmin.from('leads').select('id, name, first_name, last_name, email, do_not_contact, metadata').limit(500);
  // Automatic outreach must never claim shared/unassigned leads as the owner's audience.
  if (userId) query = query.eq('assigned_to', userId);
  const { data, error } = await query;
  if (error) throw new Error(`Unable to load the operator contact list: ${error.message}`);
  return (data || []).map((contact) => ({
    ...contact,
    metadata: isRecord(contact.metadata) ? contact.metadata : null,
  }));
}

export async function loadRuns(userId: string | null) {
  let query = supabaseAdmin.from('licensed_workflow_runs').select('*').in('workflow_key', ['hotlist_email', 'agent_email']).order('created_at', { ascending: false }).limit(20);
  if (userId) query = query.eq('user_id', userId);
  const { data, error } = await query;
  if (error && !isMissingWorkflowTableError(error)) console.warn('[LICENSED_WORKFLOW_RUNS_READ]', error.message);
  const runs = (data || []) as WorkflowRunRow[];
  if (!runs.length) return [];
  const { data: deliveries } = await supabaseAdmin.from('workflow_deliveries').select('workflow_run_id,batch_number,status,provider_message_id,error').in('workflow_run_id', runs.map((run) => run.id)).order('batch_number');
  return runs.map((run) => ({ ...presentRun(run), deliveries: (deliveries || []).filter((delivery) => delivery.workflow_run_id === run.id).map((delivery) => ({ batchNumber: delivery.batch_number, status: delivery.status, providerMessageId: delivery.provider_message_id, error: delivery.error })) }));
}

export async function findRun(idempotencyKey: string, userId: string | null) {
  if (!userId) return null;
  const { data, error } = await supabaseAdmin.from('licensed_workflow_runs').select('*').eq('idempotency_key', idempotencyKey).eq('user_id', userId).maybeSingle();
  if (error) throw new Error(`Unable to check workflow idempotency: ${error.message}`);
  return data as WorkflowRunRow | null;
}

export async function insertRun({ userId, draft, auditName, workflowKey = 'hotlist_email', metadata = {} }: { userId: string | null; draft: ReturnType<typeof buildHotlistEmailDraft> | ReturnType<typeof buildAgentEmailDraft>; auditName: string; workflowKey?: 'hotlist_email' | 'agent_email'; metadata?: Record<string, unknown> }) {
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

export async function getRun(id: string, userId: string | null) {
  if (!userId) return null;
  const { data, error } = await supabaseAdmin.from('licensed_workflow_runs').select('*').eq('id', id).eq('user_id', userId).maybeSingle();
  if (error) throw new Error(`Unable to load workflow run: ${error.message}`);
  return data as WorkflowRunRow | null;
}

export async function sendRun(run: WorkflowRunRow, profile: LicensedWorkflowProfile, auditName: string, expectedRevision?: number) {
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
      const { data: existingDelivery, error: existingDeliveryError } = await supabaseAdmin.from('workflow_deliveries').select('*').eq('workflow_run_id', claimed.id).eq('batch_number', batchNumber).maybeSingle();
      if (existingDeliveryError) throw new Error(`Unable to inspect delivery batch ${batchNumber}: ${existingDeliveryError.message}`);
      if (existingDelivery?.status === 'sent' || existingDelivery?.status === 'accepted') {
        providerMessageId ||= existingDelivery.provider_message_id;
        continue;
      }
      let delivery = existingDelivery;
      if (!delivery) {
        const { data: insertedDelivery, error: deliveryInsertError } = await supabaseAdmin.from('workflow_deliveries').insert({ workflow_run_id: claimed.id, batch_number: batchNumber, recipients: batch, idempotency_key: batchKey, status: 'pending' }).select('*').single();
        if (deliveryInsertError) throw new Error(`Unable to persist delivery batch ${batchNumber}: ${deliveryInsertError.message}`);
        delivery = insertedDelivery;
      }
      if (delivery.status === 'sent') { providerMessageId ||= delivery.provider_message_id; continue; }
      await supabaseAdmin.from('workflow_deliveries').update({ status: 'sending', error: null }).eq('id', delivery.id).eq('status', 'pending');
      try {
        const result = await sendLicensedHotlistEmail({ recipients: batch, subject: claimed.subject, body: claimed.body, replyTo: profile.replyToEmail, idempotencyKey: batchKey });
        providerMessageId ||= result.id;
        const { error: deliveryUpdateError } = await supabaseAdmin.from('workflow_deliveries').update({ status: 'accepted', provider_message_id: result.id }).eq('id', delivery.id);
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

export function presentRun(run: WorkflowRunRow) {
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

export function redactProfile(profile: LicensedWorkflowProfile) {
  return { ...profile, licenseNumber: profile.licenseNumber ? '••••' + profile.licenseNumber.slice(-4) : '' };
}

function readRecipients(value: unknown) {
  if (!Array.isArray(value)) throw new Error('Workflow recipient snapshot is invalid.');
  const recipients = value.map((item) => isRecord(item) ? String(item.email || '').trim().toLowerCase() : '').filter(Boolean);
  if (!recipients.length) throw new Error('Workflow has no eligible recipients.');
  return [...new Set(recipients)];
}

function hashAudience(value: unknown) {
  return createHash('md5').update(JSON.stringify(value)).digest('hex');
}

function isRecord(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isMissingWorkflowTableError(error: unknown) {
  const message = isRecord(error) ? String(error.message || '') : String(error);
  return message.includes('licensed_workflow_') && (message.includes('schema cache') || message.includes('does not exist'));
}

export { EmailProviderNotConfiguredError, HotlistWorkflowError };
