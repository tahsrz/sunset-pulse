import { afterEach, describe, expect, it } from 'vitest';
import { publicGuideRequestSchema, type PublicGuideContext } from '@/lib/ai/publicGuideContract';
import { getPublicGuideCuration } from '@/lib/ai/publicGuideCuration';
import {
  buildPublicGuideActions,
  PUBLIC_GUIDE_DESTINATIONS,
} from '@/lib/ai/publicGuideDestinations';
import { getJamieGuideUrl, getPublicRootOrigin, getPublicSubdomainOrigin } from '@/lib/sites/siteUrls';

afterEach(() => {
  delete process.env.JAMIE_PUBLIC_GUIDE_CURATED_SLOT;
});

describe('Jamie public guide Sprint 2 contracts', () => {
  it('builds every next step from the approved destination registry', () => {
    const context: PublicGuideContext = {
      agent: {
        agentId: 'agent-1',
        agentName: 'Jamie Agent',
        brokerageName: 'Sunset Realty',
        primaryColor: '#38bdf8',
        publicUrl: 'https://jamie-agent.sunsetpulse.app',
        site: 'jamie-agent',
        siteName: 'Jamie Agent Homes',
      },
      listing: {
        id: 'MLS-123',
        name: '123 Main Street',
        href: 'https://sunsetpulse.app/properties/MLS-123',
      },
    };

    const actions = buildPublicGuideActions({
      context,
      listings: [],
      outcome: 'context_fact',
      rootOrigin: 'https://sunsetpulse.app',
      userMessage: 'How many bedrooms does this home have?',
    });

    expect(actions.map((action) => action.id)).toEqual(['view_listing', 'contact_agent', 'view_agent_site']);
    expect(actions.every((action) => action.id in PUBLIC_GUIDE_DESTINATIONS)).toBe(true);
    expect(actions.find((action) => action.id === 'contact_agent')).not.toHaveProperty('href');
  });

  it('keeps the daily Jamie slot bounded to the approved registry', () => {
    const first = getPublicGuideCuration(new Date('2026-07-20T12:00:00.000Z'));
    const second = getPublicGuideCuration(new Date('2026-07-20T23:59:00.000Z'));
    expect(second).toEqual(first);

    process.env.JAMIE_PUBLIC_GUIDE_CURATED_SLOT = 'tour-questions';
    expect(getPublicGuideCuration().id).toBe('tour-questions');

    process.env.JAMIE_PUBLIC_GUIDE_CURATED_SLOT = 'not-approved';
    expect(getPublicGuideCuration(new Date('2026-07-20T12:00:00.000Z'))).toEqual(first);
  });

  it('creates request-aware local links without trusting arbitrary destinations', () => {
    expect(getPublicRootOrigin({ requestHost: 'jamie.localhost:3015' }))
      .toBe('http://localhost:3015');
    expect(getPublicSubdomainOrigin('taz', { requestHost: 'jamie.localhost:3015' }))
      .toBe('http://taz.localhost:3015');
    expect(getJamieGuideUrl({
      listingId: 'MLS 123',
      site: 'taz',
      requestHost: 'taz.localhost:3015',
    })).toBe('http://jamie.localhost:3015/?listing=MLS+123&site=taz');
  });

  it('accepts only listing and site identifiers as browser context', () => {
    const messages = [{
      id: 'message-1',
      role: 'user',
      parts: [{ type: 'text', text: 'Tell me about this home.' }],
    }];

    expect(publicGuideRequestSchema.parse({
      analyticsSessionId: 'session-12345678',
      context: { listingId: 'MLS-123', siteSlug: 'taz' },
      messages,
    })).toEqual({
      analyticsSessionId: 'session-12345678',
      context: { listingId: 'MLS-123', siteSlug: 'taz' },
      messages,
    });
    expect(publicGuideRequestSchema.safeParse({
      context: { listingId: 'MLS-123', listing: { price: 1 } },
      messages,
    }).success).toBe(false);
  });
});
