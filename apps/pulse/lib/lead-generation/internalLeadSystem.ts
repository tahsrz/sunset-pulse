import { z } from 'zod';

export const LEAD_SOURCES = [
  'expired_restart',
  'stale_dom',
  'absentee_owner',
  'open_house',
  'referral',
  'manual_entry',
] as const;

export const LEAD_STATUSES = [
  'research',
  'new',
  'contacted',
  'nurture',
  'appointment',
  'dead',
] as const;

export type InternalLeadSource = (typeof LEAD_SOURCES)[number];
export type InternalLeadStatus = (typeof LEAD_STATUSES)[number];

export const internalLeadSourceSchema = z.enum(LEAD_SOURCES);
export const internalLeadStatusSchema = z.enum(LEAD_STATUSES);

export const INTERNAL_LEAD_SOURCE_LABELS: Record<InternalLeadSource, string> = {
  expired_restart: 'Expired / Restart',
  stale_dom: 'Stale DOM',
  absentee_owner: 'Absentee Owner',
  open_house: 'Open House',
  referral: 'Referral',
  manual_entry: 'Manual Entry',
};

export const INTERNAL_LEAD_STATUS_LABELS: Record<InternalLeadStatus, string> = {
  research: 'Research',
  new: 'New',
  contacted: 'Contacted',
  nurture: 'Nurture',
  appointment: 'Appointment',
  dead: 'Dead',
};

export type LeadCollaborator = {
  id: string;
  name: string;
  role: string;
};

export type LeadNote = {
  id: string;
  content: string;
  author_name: string | null;
  created_at: string;
  is_pinned: boolean;
};

export type LeadAttachment = {
  id: string;
  file_name: string;
  file_type: string | null;
  context: string | null;
  created_at: string;
  signed_url?: string | null;
};

export const LEAD_INTEL_FIELDS = [
  'name',
  'first_name',
  'last_name',
  'phone',
  'email',
  'property_address',
  'mailing_address',
] as const;

export type LeadIntelField = (typeof LEAD_INTEL_FIELDS)[number];

export const LEAD_INTEL_FIELD_LABELS: Record<LeadIntelField, string> = {
  name: 'Owner name',
  first_name: 'First name',
  last_name: 'Last name',
  phone: 'Phone',
  email: 'Email',
  property_address: 'Property address',
  mailing_address: 'Mailing address',
};

export type LeadIntelSuggestion = {
  field: LeadIntelField;
  currentValue: string | null;
  proposedValue: string;
  sourceLabel: string;
};

export type LeadIntelEvidence = {
  id: string;
  created_at: string;
  source_url: string;
  source_host: string;
  source_type: 'brokerage' | 'regional_site' | 'tax_record' | 'business_profile' | 'other';
  crawl_record_id: string;
  crawl_status: 'completed' | 'unavailable' | 'blocked' | 'failed';
  captured_at: string;
  title: string | null;
  description: string | null;
  content_sha256: string;
  review_status: 'pending' | 'applied' | 'dismissed';
  accepted_fields: Partial<Record<LeadIntelField, string>>;
  reviewed_at: string | null;
  reviewed_by_name: string | null;
  suggestions: LeadIntelSuggestion[];
};

export type InternalLead = {
  id: string;
  created_at: string;
  updated_at: string;
  first_name: string | null;
  last_name: string | null;
  name: string | null;
  phone: string | null;
  email: string | null;
  property_address: string | null;
  mailing_address: string | null;
  status: InternalLeadStatus;
  prospecting_source: InternalLeadSource | null;
  assigned_to: string | null;
  raw_paste_dump: string | null;
  metadata: Record<string, unknown> | null;
  next_action_type?: 'call' | 'text' | 'email' | 'mailer' | 'door_knock' | 'follow_up' | null;
  next_action_due_at?: string | null;
  next_action_note?: string | null;
  do_not_contact?: boolean;
  contact_restriction_reason?: string | null;
  notes: LeadNote[];
  attachments: LeadAttachment[];
  intelligenceEvidence: LeadIntelEvidence[];
};

export function getLeadDisplayName(lead: Pick<InternalLead, 'first_name' | 'last_name' | 'name' | 'property_address'>) {
  const fullName = [lead.first_name, lead.last_name].filter(Boolean).join(' ').trim();
  return fullName || lead.name || lead.property_address || 'Unidentified lead';
}
