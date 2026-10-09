import { describe, expect, it } from 'vitest';
import { resolveLeadExecutionIntent } from '@/lib/sites/leadExecutionIntent';
import { deriveNextBestAction, generateFollowUpMessage } from '@/lib/sites/leadOperatingSystem';

const lead = {
  id: '11111111-1111-4111-8111-111111111111',
  created_at: '2026-08-13T12:00:00.000Z',
  agent_id: 'agent-one',
  site: 'agent-one',
  name: 'Taylor Buyer',
  email: 'taylor@example.test',
  phone: '(214) 555-1212',
  preferred_contact: 'phone' as const,
  message: 'Can I tour this listing?',
  status: 'new' as const,
  listing_name: '104 Main Street',
};

describe('lead execution intent', () => {
  it('resolves phone recommendations to a native call action', () => {
    expect(resolveLeadExecutionIntent(lead)).toMatchObject({
      type: 'call',
      actionLabel: 'Call Lead (High Intent)',
      recommendationLabel: 'Call Lead (High Intent)',
      urgency: 'immediate',
      href: 'tel:2145551212',
    });
  });

  it('falls back to a reviewable email draft when a phone number is unusable', () => {
    const intent = resolveLeadExecutionIntent({ ...lead, phone: 'not-a-number' });

    expect(intent.type).toBe('email');
    expect(intent.actionLabel).toBe('Draft email instead');
    expect(intent.recommendationLabel).toBe('Call Lead (High Intent)');
    expect(intent.href).toContain('mailto:taylor@example.test?');
    expect(intent.href).toContain('subject=');
    expect(intent.href).toContain('body=');
  });

  it('returns an unavailable intent without a usable contact channel', () => {
    expect(resolveLeadExecutionIntent({ ...lead, phone: null, email: '' })).toMatchObject({
      type: 'unavailable',
      actionLabel: 'Contact unavailable',
    });
  });

  it('uses the seller request and stated timing in a reviewable email draft', () => {
    const sellerLead = {
      ...lead,
      source: 'seller_plan',
      listing_name: null,
      phone: null,
      metadata: { sellerPlan: {
        requestKind: 'pricing_review', timing: 'one-to-three-months',
        requestedContact: { granted: true, capturedAt: '2026-10-05T12:00:00.000Z' },
        marketingOptIn: { granted: false },
      } },
      message: 'Seller requested a personally reviewed pricing / CMA conversation.',
    };
    const recommendation = deriveNextBestAction(sellerLead);
    const intent = resolveLeadExecutionIntent(sellerLead);
    const draft = generateFollowUpMessage(sellerLead, 'email', 'Taz');
    expect(recommendation.label).toBe('Prepare pricing conversation');
    expect(intent.type).toBe('email');
    expect(intent.href).toContain('mailto:taylor@example.test?');
    expect(decodeURIComponent(draft.body)).toContain('personally reviewed pricing conversation');
    expect(draft.body).toContain('1–3 months');
    expect(draft.body).not.toMatch(/private showing|home search|guaranteed price/i);
  });

  it('does not suggest repeated seller contact without a fresh reply or separate marketing consent', () => {
    const sellerLead = {
      ...lead,
      source: 'seller_plan',
      contact_attempted_at: '2026-10-05T13:00:00.000Z',
      metadata: { sellerPlan: {
        requestKind: 'seller_plan', timing: 'exploring',
        requestedContact: { granted: true, capturedAt: '2026-10-05T12:00:00.000Z' },
        marketingOptIn: { granted: false },
      } },
    };
    expect(resolveLeadExecutionIntent(sellerLead)).toMatchObject({ type: 'unavailable' });
    expect(resolveLeadExecutionIntent({ ...sellerLead, responded_at: '2026-10-05T14:00:00.000Z' }).type).toBe('email');
    expect(resolveLeadExecutionIntent({ ...sellerLead, status: 'archived' }).type).toBe('unavailable');
    const optedIn = { ...sellerLead, metadata: { sellerPlan: {
      ...sellerLead.metadata.sellerPlan,
      marketingOptIn: { granted: true, capturedAt: '2026-10-05T12:00:00.000Z' },
    } } };
    expect(resolveLeadExecutionIntent(optedIn).type).toBe('email');
  });
});
