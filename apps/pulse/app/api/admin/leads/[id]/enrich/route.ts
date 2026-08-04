export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isAuthResponse, operatorAuditUser, requireOperatorRouteAccess } from '@/lib/core/routeAuth';
import {
  LEAD_INTEL_FIELDS,
  type InternalLead,
  type LeadIntelEvidence,
  type LeadIntelField,
} from '@/lib/lead-generation/internalLeadSystem';
import { crawlLeadIntelligence } from '@/lib/lead-intel/crawlLead';
import { buildLeadEvidenceSuggestions } from '@/lib/lead-intel/leadEvidence';
import { supabaseAdmin } from '@/lib/supabase';

const uuidSchema = z.string().uuid();
const sourceTypeSchema = z.enum(['brokerage', 'regional_site', 'tax_record', 'business_profile', 'other']);
const leadFieldSchema = z.enum(LEAD_INTEL_FIELDS);

const crawlSchema = z.object({
  url: z.string().url().max(2048),
  sourceType: sourceTypeSchema,
}).strict();

const reviewSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('apply_fields'),
    evidenceId: uuidSchema,
    fields: z.array(z.object({
      field: leadFieldSchema,
      value: z.string().trim().min(1).max(500),
    }).strict()).min(1).max(7),
  }).strict(),
  z.object({
    action: z.literal('dismiss'),
    evidenceId: uuidSchema,
  }).strict(),
]);

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const access = await requireOperatorRouteAccess(request);
  if (isAuthResponse(access)) return access;

  const leadId = await parseLeadId(context);
  if (!leadId) return NextResponse.json({ ok: false, error: 'Invalid lead id.' }, { status: 400 });

  const parsed = crawlSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'Add a valid approved public URL and source type.' }, { status: 400 });
  }

  const { data: lead, error: leadError } = await supabaseAdmin
    .from('leads')
    .select('id, name, first_name, last_name, phone, email, property_address, mailing_address')
    .eq('id', leadId)
    .single();

  if (leadError || !lead) {
    return NextResponse.json({ ok: false, error: 'Lead was not found.' }, { status: 404 });
  }

  try {
    const record = await crawlLeadIntelligence({
      url: parsed.data.url,
      sourceType: parsed.data.sourceType,
      extractionMode: 'both',
      maxPages: 1,
    });
    const suggestions = buildLeadEvidenceSuggestions(record, lead as InternalLead);
    const auditUser = operatorAuditUser(access);
    const contentSha256 = crypto
      .createHash('sha256')
      .update(JSON.stringify({ markdown: record.output.markdown || '', json: record.output.json || {} }))
      .digest('hex');

    const { data: evidence, error: evidenceError } = await supabaseAdmin
      .from('lead_intel_evidence')
      .insert({
        lead_id: leadId,
        created_by: isUuid(auditUser.userId) ? auditUser.userId : null,
        created_by_name: auditUser.name || auditUser.email || 'Operator',
        source_url: record.output.sourceUrl || record.url,
        source_host: record.hostname,
        source_type: record.sourceType,
        crawl_record_id: record.id,
        crawl_status: record.status,
        captured_at: record.createdAt,
        title: record.output.title || null,
        description: record.output.description || null,
        content_sha256: contentSha256,
        extracted_data: {
          signals: isRecord(record.output.json) ? record.output.json.signals || {} : {},
          extractedRecords: isRecord(record.output.json) ? record.output.json.extracted_records || [] : [],
          extractionSchema: record.extractionSchema,
          suggestions,
          wordCount: record.output.wordCount,
        },
        markdown_excerpt: (record.output.markdown || '').slice(0, 8000) || null,
      })
      .select('id, created_at, source_url, source_host, source_type, crawl_record_id, crawl_status, captured_at, title, description, content_sha256, review_status, accepted_fields, reviewed_at, reviewed_by_name, extracted_data')
      .single();

    if (evidenceError || !evidence) {
      return NextResponse.json({ ok: false, error: evidenceError?.message || 'Evidence could not be persisted.' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, evidence: serializeEvidence(evidence) }, { status: record.status === 'completed' ? 201 : 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lead enrichment failed.';
    const status = /allowlist|private|credentials|public address/i.test(message) ? 400 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const access = await requireOperatorRouteAccess(request);
  if (isAuthResponse(access)) return access;

  const leadId = await parseLeadId(context);
  if (!leadId) return NextResponse.json({ ok: false, error: 'Invalid lead id.' }, { status: 400 });

  const parsed = reviewSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'Invalid evidence review action.' }, { status: 400 });
  }

  const auditUser = operatorAuditUser(access);
  const reviewerId = isUuid(auditUser.userId) ? auditUser.userId : null;
  const reviewerName = auditUser.name || auditUser.email || 'Operator';

  if (parsed.data.action === 'dismiss') {
    const { data, error } = await supabaseAdmin
      .from('lead_intel_evidence')
      .update({
        review_status: 'dismissed',
        reviewed_at: new Date().toISOString(),
        reviewed_by: reviewerId,
        reviewed_by_name: reviewerName,
      })
      .eq('id', parsed.data.evidenceId)
      .eq('lead_id', leadId)
      .eq('review_status', 'pending')
      .select('id')
      .maybeSingle();

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ ok: false, error: 'Pending evidence was not found.' }, { status: 404 });
    return NextResponse.json({ ok: true });
  }

  const updates = Object.fromEntries(parsed.data.fields.map(({ field, value }) => [field, value])) as Partial<Record<LeadIntelField, string>>;
  const { error } = await supabaseAdmin.rpc('apply_lead_intel_evidence_fields', {
    p_lead_id: leadId,
    p_evidence_id: parsed.data.evidenceId,
    p_updates: updates,
    p_reviewer: reviewerId,
    p_reviewer_name: reviewerName,
  });

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

async function parseLeadId(context: RouteContext) {
  const params = await context.params;
  return uuidSchema.safeParse(params.id).success ? params.id : null;
}

function serializeEvidence(row: any): LeadIntelEvidence {
  return {
    id: row.id,
    created_at: row.created_at,
    source_url: row.source_url,
    source_host: row.source_host,
    source_type: row.source_type,
    crawl_record_id: row.crawl_record_id,
    crawl_status: row.crawl_status,
    captured_at: row.captured_at,
    title: row.title,
    description: row.description,
    content_sha256: row.content_sha256,
    review_status: row.review_status,
    accepted_fields: row.accepted_fields || {},
    reviewed_at: row.reviewed_at,
    reviewed_by_name: row.reviewed_by_name,
    suggestions: Array.isArray(row.extracted_data?.suggestions) ? row.extracted_data.suggestions : [],
  };
}

function isUuid(value: string) {
  return uuidSchema.safeParse(value).success;
}

function isRecord(value: unknown): value is Record<string, any> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}
