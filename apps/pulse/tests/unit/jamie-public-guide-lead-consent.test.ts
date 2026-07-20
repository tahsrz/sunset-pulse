import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  applyApiRateLimit: vi.fn(),
  applyPublicApiRateLimit: vi.fn(),
  discoverListingById: vi.fn(),
  eq: vi.fn(),
  from: vi.fn(),
  getTenantSite: vi.fn(),
  insert: vi.fn(),
  notifyAgentSiteLead: vi.fn(),
  select: vi.fn(),
  single: vi.fn(),
  update: vi.fn(),
}));

vi.mock('@/lib/core/apiRateLimit', () => ({ applyApiRateLimit: mocks.applyApiRateLimit }));
vi.mock('@/lib/core/publicApiRateLimit', () => ({ applyPublicApiRateLimit: mocks.applyPublicApiRateLimit }));
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

beforeEach(() => {
  vi.clearAllMocks();
  mocks.applyApiRateLimit.mockResolvedValue(null);
  mocks.applyPublicApiRateLimit.mockResolvedValue(null);
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
    mocks.discoverListingById.mockResolvedValue({
      id: 'listing-record-id',
      mls_id: 'MLS-100',
      name: '100 Verified Street',
    });
    mocks.notifyAgentSiteLead.mockResolvedValue({
      status: 'sent',
      provider: 'resend',
      id: 'notification-1',
      recipients: ['agent@example.com'],
    });

    const response = await POST(new Request('https://jamie.sunsetpulse.app/api/sites/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', host: 'jamie.sunsetpulse.app' },
      body: JSON.stringify({
        ...guideLead,
        source: 'agent_site',
        consent: true,
        agentId: 'spoofed-agent',
        siteName: 'Spoofed Site',
        listing: { id: 'MLS-100', mlsId: 'FAKE-MLS', name: 'Spoofed Listing' },
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
    }));
    expect(mocks.notifyAgentSiteLead).toHaveBeenCalledWith(expect.objectContaining({
      inquiry: expect.objectContaining({
        source: 'jamie_public_guide',
        listing: {
          id: 'listing-record-id',
          mlsId: 'MLS-100',
          name: '100 Verified Street',
        },
      }),
    }));
  });
});
