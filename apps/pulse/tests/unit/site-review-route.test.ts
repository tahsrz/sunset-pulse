import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { createDefaultLaunchKit, normalizeLaunchKit } from '@/lib/sites/launchKit';

const {
  mockRequireOperatorRouteAccess,
  mockIsAuthResponse,
  mockOperatorAuditUser,
  mockReadSiteConfig,
  mockSaveSiteConfig,
  mockNotifyBuyerSiteReviewDecision,
} = vi.hoisted(() => ({
  mockRequireOperatorRouteAccess: vi.fn(),
  mockIsAuthResponse: vi.fn(),
  mockOperatorAuditUser: vi.fn(() => ({ email: 'operator@example.test', role: 'local' })),
  mockReadSiteConfig: vi.fn(),
  mockSaveSiteConfig: vi.fn(),
  mockNotifyBuyerSiteReviewDecision: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/core/routeAuth', () => ({
  requireOperatorRouteAccess: mockRequireOperatorRouteAccess,
  isAuthResponse: mockIsAuthResponse,
  operatorAuditUser: mockOperatorAuditUser,
}));
vi.mock('@/lib/sites/siteConfigStore', () => ({
  readSiteConfig: mockReadSiteConfig,
  saveSiteConfig: mockSaveSiteConfig,
}));
vi.mock('@/lib/sites/siteLifecycleNotifications', () => ({
  notifyBuyerSiteReviewDecision: mockNotifyBuyerSiteReviewDecision,
}));

import { POST } from '@/app/api/admin/sites/review/route';

describe('admin site review route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireOperatorRouteAccess.mockResolvedValue({ allowed: true, mode: 'local', reason: 'local operator' });
    mockIsAuthResponse.mockImplementation((value) => value instanceof Response);
    mockOperatorAuditUser.mockReturnValue({ email: 'operator@example.test', role: 'local' });
    mockSaveSiteConfig.mockResolvedValue(['supabase', 'mongo']);
    mockNotifyBuyerSiteReviewDecision.mockResolvedValue({ status: 'skipped', reason: 'test' });
  });

  it('rejects approve and publish when buyer-safe checks fail', async () => {
    mockReadSiteConfig.mockResolvedValue(createDefaultLaunchKit('Broker-One'));

    const response = await POST(reviewRequest({ agentId: 'Broker-One', action: 'approve_publish' }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.message).toBe('Site cannot be approved and published until buyer-safe checks pass.');
    expect(body.details).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'billing' }),
      expect.objectContaining({ key: 'hotList' }),
    ]));
    expect(mockSaveSiteConfig).not.toHaveBeenCalled();
  });

  it('publishes approved sites when readiness, billing, and review checks pass', async () => {
    const kit = normalizeLaunchKit({
      ...createDefaultLaunchKit('Broker-One'),
      agentProfile: {
        ...createDefaultLaunchKit('Broker-One').agentProfile,
        email: 'buyer@example.test',
      },
      integrationProfile: {
        ...createDefaultLaunchKit('Broker-One').integrationProfile,
        hotListMlsIds: ['NTREIS-1'],
      },
      billingProfile: {
        billingStatus: 'trialing',
        trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
      reviewProfile: {
        status: 'requested',
      },
    });
    mockReadSiteConfig.mockResolvedValue(kit);

    const response = await POST(reviewRequest({ agentId: 'Broker-One', action: 'approve_publish', notes: 'Looks good.' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.kit.status).toBe('active');
    expect(body.data.kit.reviewProfile.status).toBe('approved');
    expect(body.data.readyToPublish).toBe(true);
    expect(mockSaveSiteConfig).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'active' }),
      expect.objectContaining({ email: 'operator@example.test' }),
    );
    expect(mockNotifyBuyerSiteReviewDecision).toHaveBeenCalledWith(expect.objectContaining({
      decision: 'approved',
      email: 'buyer@example.test',
    }));
  });

  it('saves requested changes as a draft review state', async () => {
    mockReadSiteConfig.mockResolvedValue(normalizeLaunchKit({
      ...createDefaultLaunchKit('Broker-One'),
      status: 'active',
      reviewProfile: { status: 'requested' },
    }));

    const response = await POST(reviewRequest({ agentId: 'Broker-One', action: 'request_changes', notes: 'Add license.' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.kit.status).toBe('draft');
    expect(body.data.kit.reviewProfile.status).toBe('changes_requested');
    expect(body.data.kit.reviewProfile.notes).toBe('Add license.');
  });
});

function reviewRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/admin/sites/review', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
