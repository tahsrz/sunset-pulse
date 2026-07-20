import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  discoverListingById: vi.fn(),
  getTenantSite: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/data/listingDiscovery', () => ({ discoverListingById: mocks.discoverListingById }));
vi.mock('@/lib/sites/siteData', () => ({ getTenantSite: mocks.getTenantSite }));

import { resolvePublicGuideContext } from '@/lib/ai/publicGuideContext';

const originalFixture = process.env.JAMIE_PUBLIC_GUIDE_E2E_FIXTURE;
const originalVercelEnvironment = process.env.VERCEL_ENV;

describe('Jamie public guide E2E context fixture', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JAMIE_PUBLIC_GUIDE_E2E_FIXTURE = 'true';
    delete process.env.VERCEL_ENV;
    mocks.getTenantSite.mockResolvedValue({ isPublished: false });
  });

  afterEach(() => {
    if (originalFixture === undefined) delete process.env.JAMIE_PUBLIC_GUIDE_E2E_FIXTURE;
    else process.env.JAMIE_PUBLIC_GUIDE_E2E_FIXTURE = originalFixture;
    if (originalVercelEnvironment === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = originalVercelEnvironment;
  });

  it('resolves only the explicit synthetic agent when the test flag is enabled', async () => {
    const context = await resolvePublicGuideContext(
      { siteSlug: 'jamie-e2e-agent' },
      { requestHost: 'jamie.localhost:3000', protocol: 'http:', rootOrigin: 'http://localhost:3000' },
    );

    expect(context?.agent).toEqual(expect.objectContaining({
      agentId: 'jamie-e2e-agent-id',
      agentName: 'Jamie E2E Agent',
      site: 'jamie-e2e-agent',
    }));
    expect(mocks.getTenantSite).not.toHaveBeenCalled();
  });

  it('is disabled in the Vercel production environment', async () => {
    process.env.VERCEL_ENV = 'production';

    const context = await resolvePublicGuideContext(
      { siteSlug: 'jamie-e2e-agent' },
      { requestHost: 'jamie.sunsetpulse.app', protocol: 'https:', rootOrigin: 'https://sunsetpulse.app' },
    );

    expect(context).toBeNull();
    expect(mocks.getTenantSite).toHaveBeenCalledWith('jamie-e2e-agent');
  });
});
