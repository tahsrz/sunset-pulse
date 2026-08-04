import type { InternalLead } from './internalLeadSystem';

export const LEAD_MESSAGE_FIELDS = [
  'owner_name', 'first_name', 'property_address', 'mailing_address', 'market_value', 'years_held',
  'agent_name', 'brokerage_name', 'agent_phone', 'agent_email', 'license_number', 'signature',
] as const;

export type LeadMessageField = (typeof LEAD_MESSAGE_FIELDS)[number];
export type LeadMessageVariables = Record<LeadMessageField, string>;

const fieldSet = new Set<string>(LEAD_MESSAGE_FIELDS);
const tokenPattern = /{{\s*([a-z_]+)\s*}}/g;

export type OutreachIdentity = { agentName: string; brokerageName?: string | null; phone?: string | null; email?: string | null; licenseNumber?: string | null; signature?: string | null };

export function buildLeadMessageVariables(lead: InternalLead, identity: OutreachIdentity | string): LeadMessageVariables {
  const discovery = lead.metadata && typeof lead.metadata.discovery === 'object' && lead.metadata.discovery
    ? lead.metadata.discovery as Record<string, unknown>
    : {};
  const ownerName = [lead.first_name, lead.last_name].filter(Boolean).join(' ').trim() || lead.name || '';
  return {
    owner_name: ownerName,
    first_name: lead.first_name || firstWord(ownerName),
    property_address: lead.property_address || '',
    mailing_address: lead.mailing_address || '',
    market_value: formatCurrency(discovery.totalValue),
    years_held: formatNumber(discovery.yearsHeld),
    agent_name: typeof identity === 'string' ? identity : identity.agentName,
    brokerage_name: typeof identity === 'string' ? '' : identity.brokerageName || '',
    agent_phone: typeof identity === 'string' ? '' : identity.phone || '',
    agent_email: typeof identity === 'string' ? '' : identity.email || '',
    license_number: typeof identity === 'string' ? '' : identity.licenseNumber || '',
    signature: typeof identity === 'string' ? identity : identity.signature || identity.agentName,
  };
}

export function renderLeadMessage(template: string, variables: LeadMessageVariables) {
  const unknown = new Set<string>();
  const missing = new Set<LeadMessageField>();
  const text = template.replace(tokenPattern, (_match, field: string) => {
    if (!fieldSet.has(field)) {
      unknown.add(field);
      return `{{${field}}}`;
    }
    const value = variables[field as LeadMessageField];
    if (!value) missing.add(field as LeadMessageField);
    return value;
  });
  return { text, unknown: [...unknown], missing: [...missing] };
}

function firstWord(value: string) {
  return value.trim().split(/\s+/)[0] || '';
}

function formatCurrency(value: unknown) {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(number) : '';
}

function formatNumber(value: unknown) {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? String(Math.round(number)) : '';
}
