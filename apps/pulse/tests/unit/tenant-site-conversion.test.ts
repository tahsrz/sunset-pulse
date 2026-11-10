import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockSupabaseFrom, mockConnectDB, mockFindOne, mockResolveTourHotListTargets, mockGetTourHotList, mockGetPublicListingById, mockReadPublishedVibeProjection } = vi.hoisted(() => ({
  mockReadPublishedVibeProjection: vi.fn(),
  mockSupabaseFrom: vi.fn(),
  mockConnectDB: vi.fn(),
  mockFindOne: vi.fn(),
  mockResolveTourHotListTargets: vi.fn(),
  mockGetTourHotList: vi.fn(),
  mockGetPublicListingById: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: mockSupabaseFrom,
  },
}));
vi.mock('@/lib/cms/vibeService',()=>({readPublishedVibeProjection:mockReadPublishedVibeProjection}));

vi.mock('@/lib/core/database', () => ({
  default: mockConnectDB,
}));

vi.mock('@/models/SiteConfig', () => ({
  SiteConfig: {
    findOne: mockFindOne,
  },
}));

vi.mock('@/lib/data/tourHotList', () => ({
  getTourHotList: mockGetTourHotList,
  resolveTourHotListTargets: mockResolveTourHotListTargets,
}));

vi.mock('@/lib/data/listingRepository', () => ({
  getPublicListingById: mockGetPublicListingById,
}));

import { getAgentTenantSite, getTenantListingById, getTenantSite } from '@/lib/sites/siteData';

describe('tenant site conversion layer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReadPublishedVibeProjection.mockResolvedValue(null);
    mockConnectDB.mockResolvedValue(undefined);
    mockFindOne.mockReturnValue({ lean: vi.fn(() => Promise.resolve(null)) });
    mockSupabaseFrom.mockReturnValue({
      select: vi.fn(() => ({
        or: vi.fn(() => ({
          maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
    });
    mockGetTourHotList.mockResolvedValue({ listings: [] });
    mockResolveTourHotListTargets.mockResolvedValue({ listings: [] });
    mockGetPublicListingById.mockResolvedValue(null);
  });

  it('generates a clean tenant fallback for unconfigured agent sites', async () => {
    const site = await getTenantSite('broker-one');

    expect(site.agentId).toBe('broker-one-site');
    expect(site.siteName).toBe('Broker One Homes');
    expect(site.status).toBe('draft');
    expect(site.isPublished).toBe(false);
    expect(site.primaryColor).toBe('#22d3ee');
    expect(site.sections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'hero', visible: true }),
        expect.objectContaining({ type: 'featured_listings', visible: true }),
        expect.objectContaining({ type: 'about_agent', visible: true }),
        expect.objectContaining({ type: 'contact', visible: true }),
        expect.objectContaining({ type: 'compliance', visible: true }),
      ]),
    );
  });
  it('publishes a migration-only tenant without the optional Supabase pointer column and still resolves the Mongo pointer',async()=>{
    const row={agent_id:'calendar-site',subdomain:'calendar',status:'active',updated_at:'2026-10-28T12:00:00Z',branding:{siteName:'Calendar Test'},
      agent_profile:{displayName:'Test Owner',brokerageName:'Test Brokerage',email:'owner@example.test'},
      compliance_profile:{footerDisclaimer:'Test disclaimer',mlsDisclaimer:'Test MLS disclaimer'},integration_profile:{hotListMlsIds:['TEST-001']}};
    mockSupabaseFrom.mockImplementation(()=>({select:(columns:string)=>{
      const response=async()=>columns.split(',').some(column=>column.trim()==='active_vibe_revision_id')
        ? {data:null,error:{code:'42703',message:'column site_config.active_vibe_revision_id does not exist'}} : {data:row,error:null};
      return {or:()=>({maybeSingle:response}),eq:()=>({maybeSingle:response})};
    }}));
    mockFindOne.mockReturnValue({lean:async()=>({agentId:'calendar-site',updatedAt:'2026-10-27T12:00:00Z',activeVibeRevisionId:'mongo-projection'})});
    const site=await getTenantSite('calendar');
    expect(site.agentId).toBe('calendar-site');expect(site.isPublished).toBe(true);
    expect(site.activeVibeRevisionId).toBe('mongo-projection');
    expect(mockReadPublishedVibeProjection).toHaveBeenCalledWith({revisionId:'mongo-projection',tenantId:'default'});
  });

  it('loads published tenant sites with buyer-safe readiness check', async () => {
    mockSupabaseFrom.mockReturnValue({
      select: vi.fn(() => ({
        or: vi.fn(() => ({
          maybeSingle: vi.fn(() => Promise.resolve({
            data: {
              agent_id: 'taz-realty-001',
              subdomain: 'taz-realty',
              status: 'active',
              branding: {
                siteName: 'Taz Realty Group',
                primaryColor: '#2563eb',
                fontFamily: 'Inter',
              },
              hero: {
                title: 'Premier Dallas Homes',
                subtitle: 'Find your dream home with Taz.',
              },
              agent_profile: {
                displayName: 'Tahsin Reza',
                brokerageName: 'Sunset Pulse Realty',
                email: 'tahsrz@gmail.com',
                phone: '214-555-0199',
                markets: ['Dallas', 'Fort Worth'],
              },
              assistant_profile: {
                displayName: 'Jamie',
                roleLabel: 'Real Estate Assistant',
                placeholder: 'Ask about Dallas homes...',
              },
              compliance_profile: {
                jurisdiction: 'Texas Real Estate Commission',
                mlsDisclaimer: 'MLS data provided under NTREIS compliance.',
                footerDisclaimer: 'Equal Housing Opportunity.',
                equalHousing: true,
              },
              integration_profile: {
                mlsProvider: 'NTREIS',
                leadEmail: 'tahsrz@gmail.com',
                hotListMlsIds: ['NTREIS-101', 'NTREIS-102'],
              },
              billing_profile: {
                billingStatus: 'active',
              },
              review_profile: {
                status: 'approved',
              },
            },
            error: null,
          })),
        })),
      })),
    });

    mockResolveTourHotListTargets.mockResolvedValue({
      listings: [
        {
          id: 'lst-1',
          mls_id: 'NTREIS-101',
          name: '101 Modern Villa',
          location: { city: 'Dallas', state: 'TX' },
          price: 850000,
          image_url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9',
          images: ['https://images.unsplash.com/photo-1600596542815-ffad4c1539a9'],
        },
      ],
    });

    const agentSite = await getAgentTenantSite('taz-realty');

    expect(agentSite.isPublished).toBe(true);
    expect(agentSite.siteName).toBe('Taz Realty Group');
    expect(agentSite.agentProfile.displayName).toBe('Tahsin Reza');
    expect(agentSite.featuredListings).toHaveLength(1);
    expect(agentSite.featuredListings[0].name).toBe('101 Modern Villa');
    expect(mockResolveTourHotListTargets).toHaveBeenCalledWith(
      [
        { kind: 'mlsId', value: 'NTREIS-101' },
        { kind: 'mlsId', value: 'NTREIS-102' },
      ],
      { limit: 6 },
    );
  });

  it('resolves tenant detail pages only through the public listing repository', async () => {
    const tenantSite = await getTenantSite('broker-one');
    tenantSite.integrationProfile.hotListMlsIds = ['NTREIS-101'];
    mockGetPublicListingById.mockResolvedValue({ id: 'listing-1', mls_id: 'NTREIS-101' });

    await expect(getTenantListingById(tenantSite, 'listing-1')).resolves.toMatchObject({ id: 'listing-1' });
    expect(mockGetPublicListingById).toHaveBeenCalledWith('listing-1');

    mockGetPublicListingById.mockResolvedValue(null);
    await expect(getTenantListingById(tenantSite, 'private-listing')).resolves.toBeNull();
  });
});
