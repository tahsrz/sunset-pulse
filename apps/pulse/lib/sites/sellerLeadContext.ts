import type { AgentSiteLeadData } from './leadOperatingSystem';
import type { SellerPlanLeadInput } from '@/lib/marketing/leadMagnetContract';

export type SellerLeadContext = {
  requestKind: SellerPlanLeadInput['requestKind'] | null;
  timing: SellerPlanLeadInput['timing'] | null;
  requestedContact: boolean;
  marketingOptIn: boolean;
};

const TIMING_VALUES = new Set<SellerPlanLeadInput['timing']>([
  'exploring', 'within-30-days', 'one-to-three-months', 'three-to-six-months', 'later',
]);

/** Reads only the consent and request fields written by the seller-plan intake. */
export function readSellerLeadContext(lead: AgentSiteLeadData): SellerLeadContext | null {
  if (lead.source !== 'seller_plan') return null;
  const root = record(lead.metadata);
  const request = record(root?.sellerPlan);
  if (!request) return { requestKind: null, timing: null, requestedContact: false, marketingOptIn: false };

  const requestedContact = validGrant(request.requestedContact) && request.requestedContact.revokedAt == null;
  const marketingOptIn = validGrant(request.marketingOptIn) && request.marketingOptIn.revokedAt == null;
  const requestKind = request.requestKind === 'seller_plan' || request.requestKind === 'pricing_review'
    ? request.requestKind
    : null;
  const timing = TIMING_VALUES.has(request.timing as SellerPlanLeadInput['timing'])
    ? request.timing as SellerPlanLeadInput['timing']
    : null;
  return { requestKind, timing, requestedContact, marketingOptIn };
}

/** One requested response is allowed; another outbound touch needs a new reply or marketing consent. */
export function canContactSeller(lead: AgentSiteLeadData, context = readSellerLeadContext(lead)) {
  if (!context || !lead.email.trim()) return false;
  if (lead.status === 'archived' || lead.status === 'closed') return false;
  if (!context.requestedContact && !(context.marketingOptIn && Boolean(lead.contact_attempted_at))) return false;
  if (!lead.contact_attempted_at) return true;
  if (context.marketingOptIn) return true;
  const lastAttempt = Date.parse(lead.contact_attempted_at);
  const lastReply = Date.parse(lead.responded_at || '');
  return Number.isFinite(lastAttempt) && Number.isFinite(lastReply) && lastReply > lastAttempt;
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function validGrant(value: unknown): value is Record<string, unknown> & { granted: true; capturedAt: string } {
  const grant = record(value);
  return Boolean(
    grant?.granted === true
    && typeof grant.capturedAt === 'string'
    && Number.isFinite(Date.parse(grant.capturedAt)),
  );
}
