import type { InternalLead, LeadIntelField, LeadIntelSuggestion } from '@/lib/lead-generation/internalLeadSystem';
import type { LeadIntelCrawlRecord } from '@/lib/lead-intel/crawlLead';

export type LeadSnapshot = Pick<
  InternalLead,
  'name' | 'first_name' | 'last_name' | 'phone' | 'email' | 'property_address' | 'mailing_address'
>;

export type CrawlSignals = {
  owner_names?: unknown;
  first_names?: unknown;
  last_names?: unknown;
  phones?: unknown;
  emails?: unknown;
  property_addresses?: unknown;
  mailing_addresses?: unknown;
};

const structuredFieldSources: Array<{
  field: LeadIntelField;
  keys: string[];
  label: string;
}> = [
  { field: 'name', keys: ['owner_name', 'owner', 'property_owner'], label: 'Structured owner field' },
  { field: 'first_name', keys: ['first_name', 'owner_first_name'], label: 'Structured first name' },
  { field: 'last_name', keys: ['last_name', 'owner_last_name'], label: 'Structured last name' },
  { field: 'phone', keys: ['phone', 'phone_number', 'contact_phone'], label: 'Structured phone field' },
  { field: 'email', keys: ['email', 'email_address', 'contact_email'], label: 'Structured email field' },
  { field: 'property_address', keys: ['property_address', 'situs_address', 'site_address', 'address'], label: 'Structured property address' },
  { field: 'mailing_address', keys: ['mailing_address', 'owner_address', 'taxpayer_address', 'billing_address'], label: 'Structured mailing address' },
];

const suggestionSources: Array<{
  field: LeadIntelField;
  signal: keyof CrawlSignals;
  label: string;
}> = [
  { field: 'name', signal: 'owner_names', label: 'Labeled owner field' },
  { field: 'first_name', signal: 'first_names', label: 'Labeled first name' },
  { field: 'last_name', signal: 'last_names', label: 'Labeled last name' },
  { field: 'phone', signal: 'phones', label: 'Public source phone' },
  { field: 'email', signal: 'emails', label: 'Public source email' },
  { field: 'property_address', signal: 'property_addresses', label: 'Labeled property address' },
  { field: 'mailing_address', signal: 'mailing_addresses', label: 'Labeled mailing address' },
];

export function buildLeadEvidenceSuggestions(
  record: LeadIntelCrawlRecord,
  lead: LeadSnapshot,
): LeadIntelSuggestion[] {
  const payload = isRecord(record.output.json) ? record.output.json : {};
  const signals = isRecord(payload.signals) ? payload.signals as CrawlSignals : {};
  const suggestions: LeadIntelSuggestion[] = [];

  const extractedRecord = selectPrimaryExtractedRecord(getExtractedRecords(payload), lead);
  if (extractedRecord) {
    for (const source of structuredFieldSources) {
      addSuggestion(suggestions, lead, source.field, firstRecordString(extractedRecord, source.keys), source.label);
    }
  }

  for (const source of suggestionSources) {
    const proposedValue = firstString(signals[source.signal]);
    addSuggestion(suggestions, lead, source.field, proposedValue, source.label);
  }

  return suggestions;
}

function addSuggestion(
  suggestions: LeadIntelSuggestion[],
  lead: LeadSnapshot,
  field: LeadIntelField,
  proposedValue: string | null,
  sourceLabel: string,
) {
  const currentValue = lead[field];
  if (!proposedValue || suggestions.some((item) => item.field === field)) return;
  if (normalizeComparable(proposedValue) === normalizeComparable(currentValue)) return;
  suggestions.push({ field, currentValue: currentValue || null, proposedValue, sourceLabel });
}

function firstRecordString(record: Record<string, any>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim().slice(0, 500);
  }
  return null;
}

function firstString(value: unknown) {
  if (typeof value === 'string' && value.trim()) return value.trim().slice(0, 500);
  if (!Array.isArray(value)) return null;
  const candidate = value.find((item) => typeof item === 'string' && item.trim());
  return typeof candidate === 'string' ? candidate.trim().slice(0, 500) : null;
}

function getExtractedRecords(payload: Record<string, any>): unknown[] {
  if (Array.isArray(payload.extracted_records)) return payload.extracted_records;
  if (Array.isArray(payload.results)) return payload.results;
  if (Array.isArray(payload.data)) return payload.data;
  return [];
}

function selectPrimaryExtractedRecord(records: unknown[], lead: LeadSnapshot) {
  const candidates = records.filter(isRecord);
  if (candidates.length === 1) return candidates[0];
  if (!candidates.length || !lead.property_address) return null;

  const targetAddress = normalizeComparable(lead.property_address);
  return candidates.find((candidate) => {
    const candidateAddress = firstRecordString(candidate, ['property_address', 'situs_address', 'site_address', 'address']);
    const normalizedAddress = normalizeComparable(candidateAddress);
    return normalizedAddress === targetAddress ||
      (normalizedAddress.length >= 8 && (normalizedAddress.includes(targetAddress) || targetAddress.includes(normalizedAddress)));
  }) || null;
}

function normalizeComparable(value: unknown) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function isRecord(value: unknown): value is Record<string, any> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}
