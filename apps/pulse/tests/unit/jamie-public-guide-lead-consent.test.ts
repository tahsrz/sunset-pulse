import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  applyApiRateLimit: vi.fn(),
  applyPublicApiRateLimit: vi.fn(),
  buildPublicGuideHandoffBrief: vi.fn(),
  discoverListingById: vi.fn(),
  eq: vi.fn(),
  from: vi.fn(),
  getTenantSite: vi.fn(),
  insert: vi.fn(),
  notifyAgentSiteLead: vi.fn(),
  hashPublicGuideSessionId: vi.fn(),
  schedulePublicGuideEvent: vi.fn(),
  select: vi.fn(),
  single: vi.fn(),
  update: vi.fn(),
}));

vi.mock('@/lib/core/apiRateLimit', () => ({ applyApiRateLimit: mocks.applyApiRateLimit }));
vi.mock('@/lib/core/publicApiRateLimit', () => ({ applyPublicApiRateLimit: mocks.applyPublicApiRateLimit }));
vi.mock('@/lib/ai/publicGuideHandoff', () => ({
  buildPublicGuideHandoffBrief: mocks.buildPublicGuideHandoffBrief,
}));
vi.mock('@/lib/ai/publicGuideTelemetry', () => ({
  hashPublicGuideSessionId: mocks.hashPublicGuideSessionId,
  schedulePublicGuideEvent: mocks.schedulePublicGuideEvent,
}));
vi.mock('@/lib/data/listingDiscovery', () => ({ discoverListingById: mocks.discoverListingById }));
vi.mock('@/lib/sites/siteData', () => ({ getTenantSite: mocks.getTenantSite }));
vi.mock('@/lib/sites/agentLeadNotification', () => ({ notifyAgentSiteLead: mocks.notifyAgentSiteLead }));
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: mocks.from } }));

import { POST } from '@/app/api/sites/leads/route';

const guideLead = {
  agentId: 'agent-1',
  site: 'taz',
  source: 'jamie_public_guide',
  name: 'Taylor Visitor',
  email: 'taylor@example.com',
  preferredContact: 'email',
  message: 'I would like more information about this listing.',
};

const sprintThreeBrief = {
  schemaVersion: 1 as const,
  summary: 'Visitor is refining a Frisco search and wants agent guidance.',
  searchCriteria: {
    locations: ['Frisco'],
    priceMin: null,
    priceMax: 750000,
    bedsMin: 3,
    bathsMin: null,
    propertyTypes: [],
    priorities: [],
  },
  discussedListingIds: ['MLS-100', 'MLS-200'],
  statedNextStep: 'refine_search' as const,
  conversationTurnCount: 2,
  generatedBy: 'model' as const,
  transcriptStored: false as const,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.applyApiRateLimit.mockResolvedValue(null);
  mocks.applyPublicApiRateLimit.mockResolvedValue(null);
  mocks.buildPublicGuideHandoffBrief.mockResolvedValue(sprintThreeBrief);
  mocks.hashPublicGuideSessionId.mockReturnValue('hashed-session-id');
  mocks.getTenantSite.mockResolvedValue({ isPublished: false });
  mocks.from.mockReturnValue({ insert: mocks.insert, update: mocks.update });
  mocks.insert.mockReturnValue({ select: mocks.select });
  mocks.select.mockReturnValue({ single: mocks.single });
  mocks.single.mockResolvedValue({ data: { id: 'lead-1' }, error: null });
  mocks.update.mockReturnValue({ eq: mocks.eq });
  mocks.eq.mockResolvedValue({ error: null });
});

describe('Jamie public guide lead consent', () => {
  it('fails closed before tenant or database access without explicit consent', async () => {
    const response = await POST(new Request('https://jamie.sunsetpulse.app/api/sites/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', host: 'jamie.sunsetpulse.app' },
      body: JSON.stringify(guideLead),
    }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(JSON.stringify(body)).toContain('Consent is required');
    expect(mocks.getTenantSite).not.toHaveBeenCalled();
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it('cannot bypass Jamie consent by changing the browser-supplied source', async () => {
    const response = await POST(new Request('https://jamie.sunsetpulse.app/api/sites/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', host: 'jamie.sunsetpulse.app' },
      body: JSON.stringify({ ...guideLead, source: 'agent_site' }),
    }));

    expect(response.status).toBe(400);
    expect(mocks.getTenantSite).not.toHaveBeenCalled();
  });

  it('requires bounded guide context for a consented Jamie handoff', async () => {
    const response = await POST(new Request('https://jamie.sunsetpulse.app/api/sites/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', host: 'jamie.sunsetpulse.app' },
      body: JSON.stringify({ ...guideLead, consent: true }),
    }));

    expect(response.status).toBe(400);
    expect(mocks.getTenantSite).not.toHaveBeenCalled();
  });

  it('preserves the existing agent-site form contract outside Jamie', async () => {
    const response = await POST(new Request('https://taz.sunsetpulse.app/api/sites/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', host: 'taz.sunsetpulse.app' },
      body: JSON.stringify({ ...guideLead, source: 'agent_site' }),
    }));

    expect(response.status).toBe(404);
    expect(mocks.getTenantSite).toHaveBeenCalledWith('taz');
  });

  it('rejects ordinary agent-site requests that claim the Jamie source', async () => {
    const response = await POST(new Request('https://taz.sunsetpulse.app/api/sites/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', host: 'taz.sunsetpulse.app' },
      body: JSON.stringify({ ...guideLead, consent: true }),
    }));

    expect(response.status).toBe(400);
    expect(mocks.getTenantSite).not.toHaveBeenCalled();
    expect(mocks.applyPublicApiRateLimit).not.toHaveBeenCalled();
  });

  it('rebuilds a consented Jamie handoff from published tenant and listing records', async () => {
    mocks.getTenantSite.mockResolvedValue({
      isPublished: true,
      agentId: 'verified-agent',
      site: 'verified-site',
      siteName: 'Verified Homes',
      agentProfile: { displayName: 'Verified Agent', brokerageName: 'Verified Realty' },
    });
    mocks.discoverListingById.mockImplementation(async (id: string) => ({
      id: id === 'MLS-100' ? 'listing-record-id' : 'listing-record-id-2',
      mls_id: id,
      name: id === 'MLS-100' ? '100 Verified Street' : '200 Verified Street',
    }));
    mocks.buildPublicGuideHandoffBrief.mockResolvedValue({
      ...sprintThreeBrief,
      discussedListingIds: ['MLS-100', 'MLS-200'],
    });
    mocks.notifyAgentSiteLead.mockResolvedValue({
      status: 'sent',
      provider: 'resend',
      id: 'notification-1',
      recipients: ['agent@example.com'],
    });

    const response = await POST(new Request('https://jamie.sunsetpulse.app/api/sites/leads', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        host: 'jamie.sunsetpulse.app',
        referer: 'https://jamie.sunsetpulse.app/?site=verified-site&listing=MLS-100',
      },
      body: JSON.stringify({
        ...guideLead,
        source: 'agent_site',
        consent: true,
        agentId: 'spoofed-agent',
        siteName: 'Spoofed Site',
        listing: { id: 'MLS-100', mlsId: 'FAKE-MLS', name: 'Spoofed Listing' },
        guide: {
          conversation: [
            { role: 'user', text: 'Raw visitor question that must not be stored.' },
            { role: 'assistant', text: 'Transient supervised answer.' },
          ],
          discussedListingIds: ['MLS-200'],
          nextStep: 'refine_search',
          sessionId: 'session-12345678',
        },
      }),
    }));

    expect(response.status).toBe(201);
    expect(mocks.applyPublicApiRateLimit).toHaveBeenCalledWith(
      expect.any(Request),
      'jamie-public-handoff',
      5,
    );
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({
      agent_id: 'verified-agent',
      site: 'verified-site',
      site_name: 'Verified Homes',
      source: 'jamie_public_guide',
      listing_id: 'listing-record-id',
      listing_mls_id: 'MLS-100',
      listing_name: '100 Verified Street',
      page_path: '/',
      metadata: expect.objectContaining({
        publicGuideBrief: sprintThreeBrief,
        publicGuideContext: expect.objectContaining({
          discussedListingCount: 2,
          sessionIdHash: 'hashed-session-id',
          sourceHost: 'jamie',
        }),
      }),
    }));
    expect(mocks.notifyAgentSiteLead).toHaveBeenCalledWith(expect.objectContaining({
      inquiry: expect.objectContaining({
        source: 'jamie_public_guide',
        listing: {
          id: 'listing-record-id',
          mlsId: 'MLS-100',
          name: '100 Verified Street',
        },
        guideBrief: sprintThreeBrief,
      }),
    }));
    expect(mocks.buildPublicGuideHandoffBrief).toHaveBeenCalledWith(expect.objectContaining({
      verifiedListingIds: ['MLS-100', 'MLS-200'],
    }));
    expect(JSON.stringify(mocks.insert.mock.calls[0][0])).not.toContain('Raw visitor question');
    expect(mocks.schedulePublicGuideEvent).toHaveBeenCalledWith(expect.objectContaining({
      event: 'handoff_completed',
      sessionId: 'session-12345678',
    }));
  });
});
