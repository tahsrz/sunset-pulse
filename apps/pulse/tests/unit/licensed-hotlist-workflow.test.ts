import { describe, expect, it } from 'vitest';
import { buildAgentEmailDraft, buildHotlistEmailDraft, HotlistWorkflowError, type LicensedWorkflowProfile } from '@/lib/autonomous-workflows/hotlistEmail';

const profile: LicensedWorkflowProfile = {
  agentName: 'Tahsin Reza',
  brokerageName: 'Lion Drive Realty',
  licenseNumber: 'TX-12345',
  jurisdiction: 'Texas',
  serviceArea: 'North Texas',
  replyToEmail: 'agent@example.com',
  disclosureText: 'Verify listing details independently before taking any next step.',
  enabled: true,
  autoSend: false,
  maxRecipientsPerRun: 25,
};

const listing = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  mls_id: `MLS-${id}`,
  name: `${id} Home`,
  source: 'MLS',
  listing_status: 'Active',
  list_price: 650000,
  location: { street: `${id} Street`, city: 'Frisco', state: 'TX', zipcode: '75034' },
  ...overrides,
});

describe('licensed hot-list email workflow', () => {
  it('builds a licensed draft and keeps recipients private by snapshotting eligible contacts', () => {
    const draft = buildHotlistEmailDraft({
      profile,
      listings: [listing('one')],
      contacts: [
        { id: 'contact-1', first_name: 'Riley', email: 'Riley@example.com', metadata: { email_marketing_consent: true } },
        { id: 'contact-2', email: 'blocked@example.com', do_not_contact: true, metadata: { email_marketing_consent: true } },
        { id: 'contact-3', email: 'unknown@example.com', metadata: {} },
      ],
    });

    expect(draft.recipientSnapshot).toEqual([{ id: 'contact-1', name: 'Riley', email: 'riley@example.com' }]);
    expect(draft.body).toContain('Texas license TX-12345');
    expect(draft.body).toContain('Verify listing details independently');
    expect(draft.skippedContacts).toEqual(expect.arrayContaining([
      { id: 'contact-2', email: 'blocked@example.com', reason: 'do_not_contact' },
      { id: 'contact-3', email: 'unknown@example.com', reason: 'consent_missing' },
    ]));
  });

  it('refuses to create a draft when no contacts have explicit consent', () => {
    expect(() => buildHotlistEmailDraft({
      profile,
      listings: [listing('one')],
      contacts: [{ id: 'contact-1', email: 'unknown@example.com', metadata: {} }],
    })).toThrowError(new HotlistWorkflowError('No contacts with explicit email consent are eligible for this workflow.', 'no_recipients'));
  });

  it('filters non-MLS and inactive listings before composing', () => {
    expect(() => buildHotlistEmailDraft({
      profile,
      listings: [listing('fake', { source: 'manual' }), listing('closed', { listing_status: 'Closed' })],
      contacts: [{ id: 'contact-1', email: 'buyer@example.com', metadata: { email_marketing_consent: true } }],
    })).toThrowError('No verified active MLS listings are available for this workflow.');
  });

  it('honors the per-run recipient cap', () => {
    const draft = buildHotlistEmailDraft({
      profile: { ...profile, maxRecipientsPerRun: 1 },
      listings: [listing('one')],
      contacts: [
        { id: 'contact-1', email: 'one@example.com', metadata: { email_marketing_consent: true } },
        { id: 'contact-2', email: 'two@example.com', metadata: { email_marketing_consent: true } },
      ],
    });
    expect(draft.recipientSnapshot).toHaveLength(1);
    expect(draft.skippedContacts).toHaveLength(1);
  });

  it('snapshots an edited spawned-agent email for the eligible audience', () => {
    const draft = buildAgentEmailDraft({
      profile,
      subject: 'A quick market note',
      body: 'Here is the note your agent prepared for review.',
      contacts: [
        { id: 'contact-1', name: 'Riley Buyer', email: 'riley@example.com', metadata: { email_marketing_consent: true } },
        { id: 'contact-2', name: 'No Consent', email: 'no-consent@example.com', metadata: {} },
      ],
    });

    expect(draft.subject).toBe('A quick market note');
    expect(draft.body).toContain('prepared for review');
    expect(draft.recipientSnapshot).toEqual([{ id: 'contact-1', name: 'Riley Buyer', email: 'riley@example.com' }]);
    expect(draft.fingerprint).toMatch(/^[a-f0-9]{64}$/);
  });
});
