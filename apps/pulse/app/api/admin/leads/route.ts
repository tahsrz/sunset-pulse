export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isAuthResponse, operatorAuditUser, requireOperatorRouteAccess } from '@/lib/core/routeAuth';
import {
  internalLeadSourceSchema,
  internalLeadStatusSchema,
  LEAD_STATUSES,
  type InternalLead,
  type LeadAttachment,
  type LeadCollaborator,
  type LeadIntelEvidence,
  type LeadNote,
} from '@/lib/lead-generation/internalLeadSystem';
import { supabaseAdmin } from '@/lib/supabase';

const uuidSchema = z.string().uuid();
const createLeadSchema = z.object({
  firstName: z.string().trim().max(100).optional(),
  lastName: z.string().trim().max(100).optional(),
  phone: z.string().trim().max(50).optional(),
  email: z.string().trim().email().max(320).optional().or(z.literal('')),
  propertyAddress: z.string().trim().max(500).optional(),
  mailingAddress: z.string().trim().max(500).optional(),
  source: internalLeadSourceSchema.optional(),
  status: internalLeadStatusSchema.default('research'),
  assignedTo: uuidSchema.optional().or(z.literal('')),
  rawPasteDump: z.string().trim().max(20000).optional(),
  evidenceContext: z.string().trim().max(500).optional(),
}).refine((value) => Boolean(
  value.firstName || value.lastName || value.phone || value.email || value.propertyAddress || value.rawPasteDump,
), { message: 'Add a contact detail, property address, or raw research notes.' });

const updateLeadSchema = z.discriminatedUnion('action', [
  z.object({ id: uuidSchema, action: z.literal('set_status'), status: internalLeadStatusSchema }),
  z.object({ id: uuidSchema, action: z.literal('promote') }),
  z.object({ id: uuidSchema, action: z.literal('delete') }),
  z.object({ id: uuidSchema, action: z.literal('add_note'), content: z.string().trim().min(1).max(4000) }),
  z.object({
    id: uuidSchema,
    action: z.literal('update_details'),
    firstName: z.string().trim().max(100).nullable().optional(),
    lastName: z.string().trim().max(100).nullable().optional(),
    phone: z.string().trim().max(50).nullable().optional(),
    email: z.string().trim().email().max(320).nullable().optional().or(z.literal('')),
    propertyAddress: z.string().trim().max(500).nullable().optional(),
    mailingAddress: z.string().trim().max(500).nullable().optional(),
    assignedTo: uuidSchema.nullable().optional(),
  }),
]);

const supportedEvidenceTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
const maxEvidenceSize = 10 * 1024 * 1024;
const maxEvidenceFiles = 10;
const maxTotalEvidenceSize = 25 * 1024 * 1024;

type LeadRow = Omit<InternalLead, 'notes' | 'attachments' | 'intelligenceEvidence'>;
type CollaboratorRow = { id: string; full_name: string | null; username: string | null; role: string };
type LeadDetailUpdateInput = {
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  email?: string | null;
  propertyAddress?: string | null;
  mailingAddress?: string | null;
  assignedTo?: string | null;
};

export async function GET(request: NextRequest) {
  const access = await requireOperatorRouteAccess(request);
  if (isAuthResponse(access)) return access;

  try {
    const metaOnly = request.nextUrl.searchParams.get('meta') === '1';
    const status = request.nextUrl.searchParams.get('status');
    const requestedStatus = LEAD_STATUSES.includes(status as (typeof LEAD_STATUSES)[number]) ? status : 'research';

    const [leadsResult, collaboratorsResult] = await Promise.all([
      metaOnly
        ? Promise.resolve({ data: [], error: null })
        : supabaseAdmin
          .from('leads')
          .select('id, created_at, updated_at, first_name, last_name, name, phone, email, property_address, mailing_address, status, prospecting_source, assigned_to, raw_paste_dump, metadata, next_action_type, next_action_due_at, next_action_note, do_not_contact, contact_restriction_reason')
          .eq('status', requestedStatus)
          .order('updated_at', { ascending: false })
          .limit(100),
      supabaseAdmin
        .from('profiles')
        .select('id, full_name, username, role')
        .in('role', ['realtor', 'operator', 'admin'])
        .order('full_name', { ascending: true }),
    ]);

    if (leadsResult.error) {
      return NextResponse.json({ ok: false, error: leadsResult.error.message }, { status: 500 });
    }

    const collaborators: LeadCollaborator[] = (collaboratorsResult.data || []).map((profile: CollaboratorRow) => ({
      id: profile.id,
      name: profile.full_name || profile.username || 'Unnamed operator',
      role: profile.role,
    }));

    if (metaOnly) {
      return NextResponse.json({ ok: true, collaborators });
    }

    const leads = await hydrateLeads(leadsResult.data || []);
    return NextResponse.json({ ok: true, leads, collaborators });
  } catch (error) {
    console.error('[INTERNAL_LEADS_READ_FAILURE]', error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: false, error: 'Lead data is temporarily unavailable.' }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const access = await requireOperatorRouteAccess(request);
  if (isAuthResponse(access)) return access;
  const declaredLength = Number(request.headers.get('content-length') || 0);
  if (declaredLength > maxTotalEvidenceSize + 2 * 1024 * 1024) {
    return NextResponse.json({ ok: false, error: 'Lead intake payload is too large.' }, { status: 413 });
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ ok: false, error: 'A multipart lead intake payload is required.' }, { status: 400 });
  }

  const parsed = createLeadSchema.safeParse({
    firstName: formData.get('firstName') || undefined,
    lastName: formData.get('lastName') || undefined,
    phone: formData.get('phone') || undefined,
    email: formData.get('email') || undefined,
    propertyAddress: formData.get('propertyAddress') || undefined,
    mailingAddress: formData.get('mailingAddress') || undefined,
    source: formData.get('source') || undefined,
    status: formData.get('status') || 'research',
    assignedTo: formData.get('assignedTo') || undefined,
    rawPasteDump: formData.get('rawPasteDump') || undefined,
    evidenceContext: formData.get('evidenceContext') || undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message || 'Invalid lead intake.' }, { status: 400 });
  }

  const files = formData.getAll('evidence').filter((value): value is File => value instanceof File && value.size > 0);
  if (files.length > maxEvidenceFiles || files.reduce((total, file) => total + file.size, 0) > maxTotalEvidenceSize) {
    return NextResponse.json({ ok: false, error: 'Attach at most 10 evidence files totaling no more than 25 MB.' }, { status: 400 });
  }
  const invalidFile = files.find((file) => file.size > maxEvidenceSize || !supportedEvidenceTypes.has(file.type));
  if (invalidFile) {
    return NextResponse.json({ ok: false, error: 'Evidence must be a JPG, PNG, WEBP, or PDF under 10 MB.' }, { status: 400 });
  }

  const values = parsed.data;
  if (values.assignedTo && !(await isAssignableOperator(values.assignedTo))) {
    return NextResponse.json({ ok: false, error: 'The selected assignee is not an active operator.' }, { status: 400 });
  }
  const auditUser = operatorAuditUser(access);
  const name = [values.firstName, values.lastName].filter(Boolean).join(' ').trim() || values.propertyAddress || null;
  const metadata = {
    entryMode: values.rawPasteDump ? 'paste_dump' : 'structured',
    createdBy: auditUser,
    intakeAt: new Date().toISOString(),
  };

  const { data: created, error: createError } = await supabaseAdmin
    .from('leads')
    .insert({
      name,
      first_name: values.firstName || null,
      last_name: values.lastName || null,
      phone: values.phone || null,
      email: values.email || null,
      property_address: values.propertyAddress || null,
      mailing_address: values.mailingAddress || null,
      status: values.status,
      prospecting_source: values.source || 'manual_entry',
      assigned_to: values.assignedTo || null,
      raw_paste_dump: values.rawPasteDump || null,
      source: 'internal_prospecting',
      metadata,
    })
    .select('id')
    .single();

  if (createError || !created) {
    return NextResponse.json({ ok: false, error: createError?.message || 'Lead creation failed.' }, { status: 500 });
  }

  try {
    await saveEvidence(created.id, files, values.evidenceContext || null, auditUser);
  } catch (error) {
    await supabaseAdmin.from('leads').delete().eq('id', created.id);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Evidence upload failed.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, leadId: created.id }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const access = await requireOperatorRouteAccess(request);
  if (isAuthResponse(access)) return access;

  const parsed = updateLeadSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'Invalid lead action.' }, { status: 400 });
  }

  const auditUser = operatorAuditUser(access);
  const input = parsed.data;
  if (input.action === 'update_details' && !Object.keys(input).some((key) => !['id', 'action'].includes(key))) {
    return NextResponse.json({ ok: false, error: 'Add at least one lead detail to update.' }, { status: 400 });
  }

  if (input.action === 'delete') {
    const { data: attachments, error: attachmentReadError } = await supabaseAdmin
      .from('lead_attachments')
      .select('storage_path')
      .eq('lead_id', input.id);
    if (attachmentReadError) return NextResponse.json({ ok: false, error: attachmentReadError.message }, { status: 500 });

    const { data: deleted, error: deleteError } = await supabaseAdmin
      .from('leads')
      .delete()
      .eq('id', input.id)
      .select('id')
      .maybeSingle();
    if (deleteError) return NextResponse.json({ ok: false, error: deleteError.message }, { status: 500 });
    if (!deleted) return NextResponse.json({ ok: false, error: 'Lead was not found.' }, { status: 404 });

    const storagePaths = (attachments || []).map((attachment) => attachment.storage_path).filter(Boolean);
    if (storagePaths.length) {
      const { error: cleanupError } = await supabaseAdmin.storage.from('lead-evidence').remove(storagePaths);
      if (cleanupError) console.error('[LEAD_EVIDENCE_CLEANUP_FAILURE]', input.id, cleanupError.message);
    }
  } else if (input.action === 'add_note') {
    const { error } = await supabaseAdmin.from('lead_notes').insert({
      lead_id: input.id,
      author_id: isUuid(auditUser.userId) ? auditUser.userId : null,
      author_name: auditUser.name || auditUser.email || 'Operator',
      content: input.content,
    });
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  } else if (input.action === 'update_details') {
    if (input.assignedTo && !(await isAssignableOperator(input.assignedTo))) {
      return NextResponse.json({ ok: false, error: 'The selected assignee is not an active operator.' }, { status: 400 });
    }
    const updates = buildLeadDetailUpdates(input);
    const { error } = await supabaseAdmin.from('leads').update(updates).eq('id', input.id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  } else {
    const status = input.action === 'promote' ? 'new' : input.status;
    const { error } = await supabaseAdmin
      .from('leads')
      .update({ status })
      .eq('id', input.id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

async function isAssignableOperator(profileId: string) {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('id', profileId)
    .in('role', ['realtor', 'operator', 'admin'])
    .maybeSingle();
  return !error && Boolean(data?.id);
}

async function hydrateLeads(rows: LeadRow[]): Promise<InternalLead[]> {
  if (!rows.length) return [];
  const leadIds = rows.map((lead) => lead.id);
  const [notesResult, attachmentsResult, intelligenceResult] = await Promise.all([
    supabaseAdmin
      .from('lead_notes')
      .select('id, lead_id, content, author_name, created_at, is_pinned')
      .in('lead_id', leadIds)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false }),
    supabaseAdmin
      .from('lead_attachments')
      .select('id, lead_id, file_name, storage_path, file_type, context, created_at')
      .in('lead_id', leadIds)
      .order('created_at', { ascending: false }),
    supabaseAdmin
      .from('lead_intel_evidence')
      .select('id, lead_id, created_at, source_url, source_host, source_type, crawl_record_id, crawl_status, captured_at, title, description, content_sha256, review_status, accepted_fields, reviewed_at, reviewed_by_name, extracted_data')
      .in('lead_id', leadIds)
      .order('created_at', { ascending: false }),
  ]);

  const notesByLead = new Map<string, LeadNote[]>();
  for (const note of notesResult.data || []) {
    const collection = notesByLead.get(note.lead_id) || [];
    collection.push(note);
    notesByLead.set(note.lead_id, collection);
  }

  const attachments = attachmentsResult.data || [];
  const storagePaths = [...new Set(attachments.map((attachment) => attachment.storage_path))];
  const signedResult = storagePaths.length
    ? await supabaseAdmin.storage.from('lead-evidence').createSignedUrls(storagePaths, 60 * 15)
    : { data: [], error: null };
  const signedUrlByPath = new Map(
    (signedResult.data || []).map((item) => [item.path, item.signedUrl || null]),
  );

  const attachmentsByLead = new Map<string, LeadAttachment[]>();
  for (const attachment of attachments) {
    const collection = attachmentsByLead.get(attachment.lead_id) || [];
    collection.push({
      id: attachment.id,
      file_name: attachment.file_name,
      file_type: attachment.file_type,
      context: attachment.context,
      created_at: attachment.created_at,
      signed_url: signedUrlByPath.get(attachment.storage_path) || null,
    });
    attachmentsByLead.set(attachment.lead_id, collection);
  }

  const intelligenceByLead = new Map<string, LeadIntelEvidence[]>();
  for (const evidence of intelligenceResult.data || []) {
    const collection = intelligenceByLead.get(evidence.lead_id) || [];
    collection.push({
      id: evidence.id,
      created_at: evidence.created_at,
      source_url: evidence.source_url,
      source_host: evidence.source_host,
      source_type: evidence.source_type,
      crawl_record_id: evidence.crawl_record_id,
      crawl_status: evidence.crawl_status,
      captured_at: evidence.captured_at,
      title: evidence.title,
      description: evidence.description,
      content_sha256: evidence.content_sha256,
      review_status: evidence.review_status,
      accepted_fields: evidence.accepted_fields || {},
      reviewed_at: evidence.reviewed_at,
      reviewed_by_name: evidence.reviewed_by_name,
      suggestions: Array.isArray(evidence.extracted_data?.suggestions) ? evidence.extracted_data.suggestions : [],
    });
    intelligenceByLead.set(evidence.lead_id, collection);
  }

  return rows.map((lead) => ({
    ...lead,
    notes: notesByLead.get(lead.id) || [],
    attachments: attachmentsByLead.get(lead.id) || [],
    intelligenceEvidence: intelligenceByLead.get(lead.id) || [],
  })) as InternalLead[];
}

async function saveEvidence(
  leadId: string,
  files: File[],
  context: string | null,
  auditUser: ReturnType<typeof operatorAuditUser>,
) {
  const uploadedPaths: string[] = [];
  try {
    for (const file of files) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 120) || 'evidence';
      const storagePath = `${leadId}/${crypto.randomUUID()}-${safeName}`;
      const { error: uploadError } = await supabaseAdmin.storage.from('lead-evidence').upload(storagePath, file, {
        contentType: file.type,
        upsert: false,
      });
      if (uploadError) throw new Error(uploadError.message);
      uploadedPaths.push(storagePath);

      const { error: attachmentError } = await supabaseAdmin.from('lead_attachments').insert({
        lead_id: leadId,
        uploaded_by: isUuid(auditUser.userId) ? auditUser.userId : null,
        uploaded_by_name: auditUser.name || auditUser.email || 'Operator',
        file_name: file.name,
        storage_path: storagePath,
        file_type: file.type,
        context,
      });
      if (attachmentError) throw new Error(attachmentError.message);
    }
  } catch (error) {
    if (uploadedPaths.length) await supabaseAdmin.storage.from('lead-evidence').remove(uploadedPaths);
    throw error;
  }
}

function buildLeadDetailUpdates(input: LeadDetailUpdateInput) {
  const updates: Record<string, string | null> = {};
  if (input.firstName !== undefined) updates.first_name = input.firstName || null;
  if (input.lastName !== undefined) updates.last_name = input.lastName || null;
  if (input.phone !== undefined) updates.phone = input.phone || null;
  if (input.email !== undefined) updates.email = input.email || null;
  if (input.propertyAddress !== undefined) updates.property_address = input.propertyAddress || null;
  if (input.mailingAddress !== undefined) updates.mailing_address = input.mailingAddress || null;
  if (input.assignedTo !== undefined) updates.assigned_to = input.assignedTo;

  if (input.firstName !== undefined && input.lastName !== undefined) {
    const fullName = [input.firstName, input.lastName].filter(Boolean).join(' ').trim();
    if (fullName) updates.name = fullName;
    else if (input.propertyAddress !== undefined) updates.name = input.propertyAddress || null;
  }
  return updates;
}

function isUuid(value: string) {
  return uuidSchema.safeParse(value).success;
}
