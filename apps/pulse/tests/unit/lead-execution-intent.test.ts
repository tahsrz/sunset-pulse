import { describe, expect, it } from 'vitest';
import { resolveLeadExecutionIntent } from '@/lib/sites/leadExecutionIntent';

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
});
