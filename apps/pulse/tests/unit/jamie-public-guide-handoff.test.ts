import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { buildPublicGuideHandoffBrief } from '@/lib/ai/publicGuideHandoff';

const originalDisabled = process.env.JAMIE_PUBLIC_GUIDE_HANDOFF_SUMMARY_DISABLED;

afterEach(() => {
  if (originalDisabled === undefined) delete process.env.JAMIE_PUBLIC_GUIDE_HANDOFF_SUMMARY_DISABLED;
  else process.env.JAMIE_PUBLIC_GUIDE_HANDOFF_SUMMARY_DISABLED = originalDisabled;
});

describe('Jamie public guide handoff brief', () => {
  it('creates a bounded fallback brief without retaining contact details or a transcript', async () => {
    process.env.JAMIE_PUBLIC_GUIDE_HANDOFF_SUMMARY_DISABLED = 'true';

    const brief = await buildPublicGuideHandoffBrief({
      handoff: {
        conversation: [
          {
            role: 'user',
            text: 'Find a 3 bedroom condo under $750k. My email is visitor@example.com and phone is 214-555-0199.',
          },
          { role: 'assistant', text: 'I can check verified listings and help with commute priorities.' },
        ],
        discussedListingIds: ['client-supplied-id'],
        nextStep: 'refine_search',
        sessionId: 'session-12345678',
      },
      verifiedListingIds: ['MLS-100'],
    });

    expect(brief).toMatchObject({
      schemaVersion: 1,
      discussedListingIds: ['MLS-100'],
      statedNextStep: 'refine_search',
      conversationTurnCount: 2,
      generatedBy: 'deterministic',
      transcriptStored: false,
      searchCriteria: {
        priceMax: 750000,
        bedsMin: 3,
        propertyTypes: ['condo'],
      },
    });
    expect(brief.summary).not.toContain('visitor@example.com');
    expect(brief.summary).not.toContain('214-555-0199');
    expect(JSON.stringify(brief)).not.toContain('client-supplied-id');
  });
});
