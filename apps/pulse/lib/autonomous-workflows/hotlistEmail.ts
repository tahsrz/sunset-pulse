import { createHash } from 'node:crypto';
import { z } from 'zod';

export const licensedWorkflowProfileSchema = z.object({
  agentName: z.string().trim().min(1).max(120),
  brokerageName: z.string().trim().min(1).max(160),
  licenseNumber: z.string().trim().min(1).max(80),
  jurisdiction: z.string().trim().min(2).max(120),
  serviceArea: z.string().trim().min(2).max(180),
  replyToEmail: z.string().trim().email().max(320),
  disclosureText: z.string().trim().min(10).max(1200),
  enabled: z.boolean().default(false),
  autoSend: z.boolean().default(false),
  maxRecipientsPerRun: z.number().int().min(1).max(50).default(25),
  cadence: z.enum(['hourly', 'daily', 'weekly']).default('daily'),
  timeZone: z.string().trim().min(1).max(80).default('America/Chicago'),
  localHour: z.number().int().min(0).max(23).default(8),
  localMinute: z.number().int().min(0).max(59).default(0),
});

export type LicensedWorkflowProfile = z.infer<typeof licensedWorkflowProfileSchema>;

export type HotlistWorkflowListing = {
  id: string;
  mls_id?: string | null;
  name: string;
  source?: string | null;
  listing_status?: string | null;
  list_price?: number | null;
  price?: number | null;
  location?: { street?: string; city?: string; state?: string; zipcode?: string } | null;
};

export type HotlistWorkflowContact = {
  id: string;
  name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  do_not_contact?: boolean | null;
  metadata?: Record<string, unknown> | null;
};

export type HotlistEmailDraft = {
  subject: string;
  body: string;
  fingerprint: string;
  listingSnapshot: HotlistWorkflowListing[];
  recipientSnapshot: Array<{ id: string; name: string; email: string }>;
  skippedContacts: Array<{ id: string; email: string | null; reason: 'do_not_contact' | 'no_email' | 'consent_missing' | 'duplicate' }>;
  skippedListings: Array<{ id: string; reason: 'not_mls' | 'not_active' | 'missing_mls_id' }>;
};

export type AgentEmailDraft = {
  subject: string;
  body: string;
  fingerprint: string;
  recipientSnapshot: Array<{ id: string; name: string; email: string }>;
  skippedContacts: HotlistEmailDraft['skippedContacts'];
};

export class HotlistWorkflowError extends Error {
  constructor(message: string, readonly code: 'profile_incomplete' | 'no_listings' | 'no_recipients' | 'disabled') {
    super(message);
  }
}

export function buildHotlistEmailDraft({
  profile,
  listings,
  contacts,
}: {
  profile: LicensedWorkflowProfile;
  listings: HotlistWorkflowListing[];
  contacts: HotlistWorkflowContact[];
}): HotlistEmailDraft {
  const parsedProfile = licensedWorkflowProfileSchema.safeParse(profile);
  if (!parsedProfile.success) {
    throw new HotlistWorkflowError('Complete the licensed agent profile before creating a workflow draft.', 'profile_incomplete');
  }

  const qualifiedListings: HotlistWorkflowListing[] = [];
  const skippedListings: HotlistEmailDraft['skippedListings'] = [];
  for (const listing of listings) {
    if (String(listing.source || '').toLowerCase() !== 'mls') {
      skippedListings.push({ id: listing.id, reason: 'not_mls' });
      continue;
    }
    if (!listing.mls_id?.trim()) {
      skippedListings.push({ id: listing.id, reason: 'missing_mls_id' });
      continue;
    }
    if (!['active', 'active under contract', 'coming soon'].includes(String(listing.listing_status || '').trim().toLowerCase())) {
      skippedListings.push({ id: listing.id, reason: 'not_active' });
      continue;
    }
    qualifiedListings.push(listing);
  }

  if (qualifiedListings.length === 0) {
    throw new HotlistWorkflowError('No verified active MLS listings are available for this workflow.', 'no_listings');
  }

  const { recipientSnapshot, skippedContacts } = selectEligibleContacts(contacts, parsedProfile.data.maxRecipientsPerRun);

  if (recipientSnapshot.length === 0) {
    throw new HotlistWorkflowError('No contacts with explicit email consent are eligible for this workflow.', 'no_recipients');
  }

  const subject = `New MLS home picks in ${parsedProfile.data.serviceArea}`;
  const body = [
    'Hi there,',
    '',
    `I pulled a few verified MLS homes in ${parsedProfile.data.serviceArea} that may be worth a look:`,
    '',
    ...qualifiedListings.map(formatListing),
    '',
    'Reply to this email if you want to discuss a showing or your search. I will confirm availability and details before any next step.',
    '',
    `${parsedProfile.data.agentName}`,
    parsedProfile.data.brokerageName,
    `${parsedProfile.data.jurisdiction} license ${parsedProfile.data.licenseNumber}`,
    `Reply: ${parsedProfile.data.replyToEmail}`,
    '',
    parsedProfile.data.disclosureText,
  ].join('\n');
  const fingerprint = createHash('sha256').update(JSON.stringify({
    profile: parsedProfile.data,
    listings: qualifiedListings,
    recipients: recipientSnapshot,
    subject,
    body,
  })).digest('hex');

  return { subject, body, fingerprint, listingSnapshot: qualifiedListings, recipientSnapshot, skippedContacts, skippedListings };
}

export function buildAgentEmailDraft({
  profile,
  subject,
  body,
  contacts,
}: {
  profile: LicensedWorkflowProfile;
  subject: string;
  body: string;
  contacts: HotlistWorkflowContact[];
}): AgentEmailDraft {
  const parsedProfile = licensedWorkflowProfileSchema.safeParse(profile);
  if (!parsedProfile.success) throw new HotlistWorkflowError('Complete the licensed agent profile before saving an agent email.', 'profile_incomplete');
  const cleanSubject = subject.trim();
  const cleanBody = body.trim();
  if (!cleanSubject || !cleanBody) throw new HotlistWorkflowError('An agent email needs both a subject and message body.', 'no_recipients');
  const { recipientSnapshot, skippedContacts } = selectEligibleContacts(contacts, parsedProfile.data.maxRecipientsPerRun);
  if (recipientSnapshot.length === 0) throw new HotlistWorkflowError('No contacts with explicit email consent are eligible for this email.', 'no_recipients');
  const fingerprint = createHash('sha256').update(JSON.stringify({ workflow: 'agent_email', profile: parsedProfile.data, subject: cleanSubject, body: cleanBody, recipients: recipientSnapshot })).digest('hex');
  return { subject: cleanSubject, body: cleanBody, fingerprint, recipientSnapshot, skippedContacts };
}

function selectEligibleContacts(contacts: HotlistWorkflowContact[], maxRecipients: number) {
  const recipientSnapshot: HotlistEmailDraft['recipientSnapshot'] = [];
  const skippedContacts: HotlistEmailDraft['skippedContacts'] = [];
  const seenEmails = new Set<string>();
  for (const contact of contacts) {
    const email = String(contact.email || '').trim().toLowerCase();
    const metadata = contact.metadata || {};
    const consent = metadata.email_marketing_consent === true || metadata.emailConsent === 'subscribed';
    if (contact.do_not_contact || metadata.email_opt_out === true || metadata.emailOptOut === true) {
      skippedContacts.push({ id: contact.id, email: email || null, reason: 'do_not_contact' });
      continue;
    }
    if (!email) {
      skippedContacts.push({ id: contact.id, email: null, reason: 'no_email' });
      continue;
    }
    if (!consent) {
      skippedContacts.push({ id: contact.id, email, reason: 'consent_missing' });
      continue;
    }
    if (seenEmails.has(email) || recipientSnapshot.length >= maxRecipients) {
      skippedContacts.push({ id: contact.id, email, reason: 'duplicate' });
      continue;
    }
    seenEmails.add(email);
    recipientSnapshot.push({ id: contact.id, name: getContactName(contact), email });
  }
  return { recipientSnapshot, skippedContacts };
}

function formatListing(listing: HotlistWorkflowListing) {
  const address = [listing.location?.street, listing.location?.city, listing.location?.state, listing.location?.zipcode].filter(Boolean).join(', ');
  const price = listing.list_price ?? listing.price;
  const priceText = typeof price === 'number' ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(price) : 'Price not supplied';
  return `• ${address || listing.name} — ${priceText}\n  MLS ID: ${listing.mls_id}\n  View: /properties/${encodeURIComponent(listing.mls_id || listing.id)}`;
}

function getContactName(contact: HotlistWorkflowContact) {
  return [contact.first_name, contact.last_name].filter(Boolean).join(' ').trim() || contact.name?.trim() || 'there';
}
