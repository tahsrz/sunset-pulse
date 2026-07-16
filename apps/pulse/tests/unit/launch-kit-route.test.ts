import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { createDefaultLaunchKit } from '@/lib/sites/launchKit';

const {
  mockRequireOperatorRouteAccess,
  mockIsAuthResponse,
  mockOperatorAuditUser,
  mockSupabaseFrom,
  mockConnectDB,
  mockFindOne,
  mockFindOneAndUpdate,
} = vi.hoisted(() => ({
  mockRequireOperatorRouteAccess: vi.fn(),
  mockIsAuthResponse: vi.fn(),
  mockOperatorAuditUser: vi.fn(() => ({ email: 'operator@example.test', role: 'local' })),
  mockSupabaseFrom: vi.fn(),
  mockConnectDB: vi.fn(),
  mockFindOne: vi.fn(),
  mockFindOneAndUpdate: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/core/routeAuth', () => ({
  requireOperatorRouteAccess: mockRequireOperatorRouteAccess,
  isAuthResponse: mockIsAuthResponse,
  operatorAuditUser: mockOperatorAuditUser,
}));
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: mockSupabaseFrom,
  },
}));
vi.mock('@/lib/core/database', () => ({
  default: mockConnectDB,
}));
vi.mock('@/models/SiteConfig', () => ({
  SiteConfig: {
    findOne: mockFindOne,
    findOneAndUpdate: mockFindOneAndUpdate,
  },
}));

import { GET, PUT } from '@/app/api/admin/sites/launch-kit/route';

describe('admin launch-kit route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireOperatorRouteAccess.mockResolvedValue({ allowed: true, mode: 'local', reason: 'local operator' });
    mockIsAuthResponse.mockImplementation((value) => value instanceof Response);
    mockOperatorAuditUser.mockReturnValue({ email: 'operator@example.test', role: 'local' });
    mockConnectDB.mockResolvedValue(undefined);
    mockFindOne.mockReturnValue({ lean: vi.fn(() => Promise.resolve(null)) });
    mockFindOneAndUpdate.mockResolvedValue({});
    mockSupabaseFrom.mockReturnValue(supabaseTable());
  });

  it('loads a default launch kit when no stored site config exists', async () => {
    const response = await GET(new NextRequest('http://localhost/api/admin/sites/launch-kit?agentId=Broker-One'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.kit.agentId).toBe('broker-one');
    expect(body.data.kit.status).toBe('draft');
    expect(body.data.readyToPublish).toBe(false);
  });

  it('saves a draft kit to the configured stores', async () => {
    const kit = {
      ...createDefaultLaunchKit('Broker-One'),
      integrationProfile: {
        ...createDefaultLaunchKit('Broker-One').integrationProfile,
        hotListMlsIds: ['NTREIS-1'],
      },
    };

    const response = await PUT(jsonRequest(kit));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.savedStores).toEqual(['supabase', 'mongo']);
    expect(body.data.kit.agentId).toBe('broker-one');
    expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
      { agentId: 'broker-one' },
      expect.objectContaining({ agentId: 'broker-one', lastModifiedBy: 'operator@example.test' }),
      { upsert: true, new: true },
    );
  });

  it('rejects active publish when buyer-safe checks are incomplete', async () => {
    const kit = {
      ...createDefaultLaunchKit('Broker-One'),
      status: 'active',
    };

    const response = await PUT(jsonRequest(kit));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.message).toBe('Launch kit is not buyer-safe to publish.');
    expect(body.details).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'hotList' }),
      expect.objectContaining({ key: 'billing' }),
      expect.objectContaining({ key: 'review' }),
    ]));
    expect(mockFindOneAndUpdate).not.toHaveBeenCalled();
  });
});

function jsonRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/admin/sites/launch-kit', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function supabaseTable() {
  return {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
    upsert: vi.fn(() => Promise.resolve({ data: null, error: null })),
  };
}
