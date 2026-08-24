export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { z } from 'zod';
import { isAuthResponse, operatorAuditUser, requireOperatorRouteAccess } from '@/lib/core/routeAuth';
import { buildLeadMessageVariables, renderLeadMessage } from '@/lib/lead-generation/leadCorrespondence';
import type { InternalLead } from '@/lib/lead-generation/internalLeadSystem';
import { supabaseAdmin } from '@/lib/supabase';

const uuid = z.string().uuid();
const channel = z.enum(['email', 'letter']);
const templateBody = z.object({
  name: z.string().trim().min(1).max(120), channel,
  subjectTemplate: z.string().max(300).optional(), bodyTemplate: z.string().trim().min(1).max(12000),
});
const requestSchema = z.discriminatedUnion('action', [
  templateBody.extend({ action: z.literal('save_template') }),
  templateBody.extend({ action: z.literal('generate_drafts'), leadIds: z.array(uuid).min(1).max(50), templateId: uuid.optional() }),
]);
const patchSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('update_draft'), id: uuid, subject: z.string().max(300).nullable(), body: z.string().trim().min(1).max(12000) }),
  z.object({ action: z.literal('set_status'), id: uuid, status: z.enum(['approved', 'archived']), nextActionDueAt: z.string().datetime().optional() }),
  z.object({ action: z.literal('set_compliance'), leadId: uuid, doNotContact: z.boolean(), reason: z.string().trim().max(500).optional() }),
  z.object({ action: z.literal('save_settings'), agentName: z.string().trim().min(1).max(120), brokerageName: z.string().trim().max(160).optional(), phone: z.string().trim().max(50).optional(), email: z.string().trim().email().max(320).optional().or(z.literal('')), licenseNumber: z.string().trim().max(80).optional(), signature: z.string().trim().max(2000).optional() }),
]);

export async function GET(request: NextRequest) {
  const access = await requireOperatorRouteAccess(request);
  if (isAuthResponse(access)) return access;
  if (access.user?.role === 'realtor') return NextResponse.json({ ok: false, error: 'Correspondence access requires an agent-scoped lead workspace.' }, { status: 403 });
  const audit = operatorAuditUser(access);
  const auditId = uuid.safeParse(audit.userId).success ? audit.userId : null;
  const [templateResult, draftResult, settingsResult] = await Promise.all([
    supabaseAdmin.from('lead_message_templates')
    .select('id, name, channel, subject_template, body_template, created_by_name, updated_at')
    .order('updated_at', { ascending: false }).limit(50),
    supabaseAdmin.from('lead_message_drafts').select('id, lead_id, channel, recipient_email, subject, body, status, created_by_name, updated_by_name, created_at, updated_at, approved_at, leads(name, first_name, last_name, property_address, mailing_address, do_not_contact)').order('updated_at', { ascending: false }).limit(100),
    auditId ? supabaseAdmin.from('lead_outreach_settings').select('*').eq('user_id', auditId).maybeSingle() : Promise.resolve({ data: null, error: null }),
  ]);
  if (templateResult.error || draftResult.error || settingsResult.error) return NextResponse.json({ ok: false, error: templateResult.error?.message || draftResult.error?.message || settingsResult.error?.message }, { status: 500 });
  return NextResponse.json({ ok: true, templates: templateResult.data || [], drafts: draftResult.data || [], settings: settingsResult.data });
}

export async function POST(request: NextRequest) {
  const access = await requireOperatorRouteAccess(request);
  if (isAuthResponse(access)) return access;
  if (access.user?.role === 'realtor') return NextResponse.json({ ok: false, error: 'Correspondence access requires an agent-scoped lead workspace.' }, { status: 403 });
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message || 'Invalid correspondence request.' }, { status: 400 });

  const input = parsed.data;
  const audit = operatorAuditUser(access);
  const auditId = uuid.safeParse(audit.userId).success ? audit.userId : null;
  const auditName = audit.name || audit.email || 'Operator';
  const unknownTokens = [input.subjectTemplate || '', input.bodyTemplate].flatMap((text) => renderLeadMessage(text, emptyVariables()).unknown);
  if (unknownTokens.length) return NextResponse.json({ ok: false, error: `Unknown merge field: {{${unknownTokens[0]}}}` }, { status: 400 });

  if (input.action === 'save_template') {
    const { data, error } = await supabaseAdmin.from('lead_message_templates').insert({
      name: input.name, channel: input.channel, subject_template: input.subjectTemplate || null,
      body_template: input.bodyTemplate, created_by: auditId, created_by_name: auditName,
    }).select('id').single();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, templateId: data.id }, { status: 201 });
  }

  const { data: leads, error: leadError } = await supabaseAdmin.from('leads')
    .select('id, first_name, last_name, name, email, property_address, mailing_address, metadata, do_not_contact')
    .in('id', input.leadIds);
  if (leadError) return NextResponse.json({ ok: false, error: leadError.message }, { status: 500 });
  if ((leads || []).length !== input.leadIds.length) return NextResponse.json({ ok: false, error: 'One or more selected leads were not found.' }, { status: 404 });

  const blocked = (leads || []).filter((lead) => lead.do_not_contact);
  if (blocked.length) return NextResponse.json({ ok: false, error: `${blocked.length} selected lead(s) are marked do not contact.` }, { status: 409 });
  const { data: settings } = auditId ? await supabaseAdmin.from('lead_outreach_settings').select('*').eq('user_id', auditId).maybeSingle() : { data: null };
  const identity = { agentName: settings?.agent_name || auditName, brokerageName: settings?.brokerage_name, phone: settings?.phone, email: settings?.email, licenseNumber: settings?.license_number, signature: settings?.signature };
  const drafts = (leads || []).map((lead) => {
    const variables = buildLeadMessageVariables(lead as InternalLead, identity);
    const fingerprint = createHash('sha256').update(`${lead.id}|${input.channel}|${input.subjectTemplate || ''}|${input.bodyTemplate}`).digest('hex');
    return {
      lead_id: lead.id, template_id: input.templateId || null, channel: input.channel,
      recipient_email: lead.email || null,
      subject: input.channel === 'email' ? renderLeadMessage(input.subjectTemplate || '', variables).text || null : null,
      body: renderLeadMessage(input.bodyTemplate, variables).text,
      variable_snapshot: variables, fingerprint, created_by: auditId, created_by_name: auditName, updated_by: auditId, updated_by_name: auditName,
    };
  });
  const { data: inserted, error } = await supabaseAdmin.from('lead_message_drafts').upsert(drafts, { onConflict: 'fingerprint', ignoreDuplicates: true }).select('id');
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, count: inserted?.length || 0, skipped: drafts.length - (inserted?.length || 0) }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const access = await requireOperatorRouteAccess(request);
  if (isAuthResponse(access)) return access;
  if (access.user?.role === 'realtor') return NextResponse.json({ ok: false, error: 'Correspondence access requires an agent-scoped lead workspace.' }, { status: 403 });
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message || 'Invalid correspondence update.' }, { status: 400 });
  const input = parsed.data;
  const audit = operatorAuditUser(access);
  const auditId = uuid.safeParse(audit.userId).success ? audit.userId : null;
  const auditName = audit.name || audit.email || 'Operator';
  if (input.action === 'save_settings') {
    if (!auditId) return NextResponse.json({ ok: false, error: 'A signed-in user is required to save outreach identity.' }, { status: 400 });
    const { error } = await supabaseAdmin.from('lead_outreach_settings').upsert({ user_id: auditId, agent_name: input.agentName, brokerage_name: input.brokerageName || null, phone: input.phone || null, email: input.email || null, license_number: input.licenseNumber || null, signature: input.signature || null });
    return error ? NextResponse.json({ ok: false, error: error.message }, { status: 500 }) : NextResponse.json({ ok: true });
  }
  if (input.action === 'set_compliance') {
    const { error } = await supabaseAdmin.from('leads').update({ do_not_contact: input.doNotContact, contact_restriction_reason: input.doNotContact ? input.reason || 'Operator restriction' : null, contact_restriction_at: input.doNotContact ? new Date().toISOString() : null }).eq('id', input.leadId);
    return error ? NextResponse.json({ ok: false, error: error.message }, { status: 500 }) : NextResponse.json({ ok: true });
  }
  if (input.action === 'update_draft') {
    const { error } = await supabaseAdmin.from('lead_message_drafts').update({ subject: input.subject, body: input.body, updated_by: auditId, updated_by_name: auditName }).eq('id', input.id).eq('status', 'draft');
    return error ? NextResponse.json({ ok: false, error: error.message }, { status: 500 }) : NextResponse.json({ ok: true });
  }
  const { data: draft, error: readError } = await supabaseAdmin.from('lead_message_drafts').select('lead_id, channel, leads(do_not_contact)').eq('id', input.id).single();
  if (readError) return NextResponse.json({ ok: false, error: readError.message }, { status: 500 });
  const linkedLead = Array.isArray(draft.leads) ? draft.leads[0] : draft.leads;
  if (input.status === 'approved' && linkedLead?.do_not_contact) return NextResponse.json({ ok: false, error: 'This lead is marked do not contact.' }, { status: 409 });
  const now = new Date().toISOString();
  const { error: draftError } = await supabaseAdmin.from('lead_message_drafts').update({ status: input.status, approved_at: input.status === 'approved' ? now : null, approved_by_name: input.status === 'approved' ? auditName : null, updated_by: auditId, updated_by_name: auditName }).eq('id', input.id);
  if (draftError) return NextResponse.json({ ok: false, error: draftError.message }, { status: 500 });
  if (input.status === 'approved') {
    const dueAt = input.nextActionDueAt || new Date(Date.now() + 86400000).toISOString();
    const { error } = await supabaseAdmin.from('leads').update({ next_action_type: draft.channel === 'letter' ? 'mailer' : 'email', next_action_due_at: dueAt, next_action_note: 'Send approved correspondence draft' }).eq('id', draft.lead_id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

function emptyVariables() {
  return { owner_name: '', first_name: '', property_address: '', mailing_address: '', market_value: '', years_held: '', agent_name: '', brokerage_name: '', agent_phone: '', agent_email: '', license_number: '', signature: '' };
}
