import { describe, it, expect, beforeEach, vi } from 'vitest';

const storeMocks = vi.hoisted(() => ({
  connectDB: vi.fn(),
  supabaseFrom: vi.fn(),
  resolveSupabaseQuery: vi.fn(),
  supabaseUpsert: vi.fn(),
  mongoFindOne: vi.fn(),
  mongoFind: vi.fn(),
  mongoFindOneAndUpdate: vi.fn(),
  resolveMongoFindOne: vi.fn(),
  resolveMongoFind: vi.fn(),
}));

vi.mock('@/lib/core/database', () => ({
  default: storeMocks.connectDB,
}));

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: storeMocks.supabaseFrom,
  },
}));

vi.mock('@/models/SiteConfig', () => ({
  SiteConfig: {
    findOne: storeMocks.mongoFindOne,
    find: storeMocks.mongoFind,
    findOneAndUpdate: storeMocks.mongoFindOneAndUpdate,
  },
}));

import {
  readExpiredPastDueSiteConfigs,
  readSiteConfig,
  readSiteConfigByOwnerUser,
  readSiteConfigByStripeSubscriptionId,
  saveSiteConfig,
} from '@/lib/sites/siteConfigStore';
import { createDefaultLaunchKit } from '@/lib/sites/launchKit';

describe('siteConfigStore', () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();

    storeMocks.connectDB.mockResolvedValue(undefined);
    storeMocks.supabaseFrom.mockImplementation(() => createSupabaseQuery());
    storeMocks.resolveSupabaseQuery.mockResolvedValue({ data: null, error: null });
    storeMocks.supabaseUpsert.mockResolvedValue({ error: null });
    storeMocks.resolveMongoFindOne.mockResolvedValue(null);
    storeMocks.resolveMongoFind.mockResolvedValue([]);
    storeMocks.mongoFindOne.mockImplementation((query) => ({
      lean: vi.fn(() => storeMocks.resolveMongoFindOne(query)),
      sort: vi.fn((sort) => ({
        lean: vi.fn(() => storeMocks.resolveMongoFindOne(query, sort)),
      })),
    }));
    storeMocks.mongoFind.mockImplementation((query) => ({
      sort: vi.fn((sort) => ({
        limit: vi.fn((limit) => ({
          lean: vi.fn(() => storeMocks.resolveMongoFind(query, sort, limit)),
        })),
      })),
    }));
    storeMocks.mongoFindOneAndUpdate.mockResolvedValue({});
  });

  it('returns Mongo when Mongo has the fresher site config write', async () => {
    const supabaseRow = {
      agent_id: 'broker-one',
      status: 'suspended',
      updated_at: '2026-07-23T10:00:00.000Z',
    };
    const mongoRow = {
      agentId: 'broker-one',
      status: 'active',
      updatedAt: '2026-07-23T11:00:00.000Z',
    };

    storeMocks.resolveSupabaseQuery.mockResolvedValue({ data: supabaseRow, error: null });
    storeMocks.resolveMongoFindOne.mockResolvedValue(mongoRow);

    await expect(readSiteConfig('broker-one')).resolves.toBe(mongoRow);
  });

  it('uses provisioning audit time as a freshness fallback for older Mongo records', async () => {
    const supabaseRow = {
      agent_id: 'broker-one',
      status: 'suspended',
      updated_at: '2026-07-23T10:00:00.000Z',
      provisioning_audit: [{ occurredAt: '2026-07-23T10:00:00.000Z' }],
    };
    const mongoRow = {
      agentId: 'broker-one',
      status: 'active',
      provisioningAudit: [{ occurredAt: '2026-07-23T11:00:00.000Z' }],
    };

    storeMocks.resolveSupabaseQuery.mockResolvedValue({ data: supabaseRow, error: null });
    storeMocks.resolveMongoFindOne.mockResolvedValue(mongoRow);

    await expect(readSiteConfig('broker-one')).resolves.toBe(mongoRow);
  });

  it('does not return an expired Supabase grace row when Mongo has newer active state', async () => {
    const supabaseExpiredRow = {
      agent_id: 'broker-one',
      billing_profile: {
        billingStatus: 'past_due',
        gracePeriodEndsAt: '2026-07-23T09:00:00.000Z',
      },
      updated_at: '2026-07-23T09:00:00.000Z',
    };
    const mongoCurrentRow = {
      agentId: 'broker-one',
      billingProfile: {
        billingStatus: 'active',
      },
      updatedAt: '2026-07-23T11:00:00.000Z',
    };

    storeMocks.resolveSupabaseQuery.mockImplementation(async (query) => {
      if (query.filters.some((filter: any) => filter.column === 'billing_profile->>billingStatus')) {
        return { data: [supabaseExpiredRow], error: null };
      }

      return { data: supabaseExpiredRow, error: null };
    });
    storeMocks.resolveMongoFind.mockResolvedValue([]);
    storeMocks.resolveMongoFindOne.mockResolvedValue(mongoCurrentRow);

    await expect(readExpiredPastDueSiteConfigs('2026-07-23T12:00:00.000Z')).resolves.toEqual([]);
  });

  it('falls through to billing-profile owner lookup after logging owner-id query errors', async () => {
    const billingRow = {
      agent_id: 'broker-one',
      owner_id: null,
      billing_profile: { userId: 'user-1' },
      updated_at: '2026-07-23T10:00:00.000Z',
    };

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    storeMocks.resolveSupabaseQuery.mockImplementation(async (query) => {
      if (query.eqs.some((eq: any) => eq.column === 'owner_id')) {
        return { data: null, error: { message: 'invalid uuid syntax' } };
      }

      return { data: billingRow, error: null };
    });

    await expect(readSiteConfigByOwnerUser('user-1')).resolves.toBe(billingRow);
    expect(warnSpy).toHaveBeenCalledWith('[SITE_CONFIG_SUPABASE_OWNER_ID_READ]', 'invalid uuid syntax');
    warnSpy.mockRestore();
  });

  it('looks up site configs by Stripe subscription id across both stores', async () => {
    const supabaseRow = {
      agent_id: 'broker-one',
      updated_at: '2026-07-23T10:00:00.000Z',
      billing_profile: { stripeSubscriptionId: 'sub_123' },
    };
    const mongoRow = {
      agentId: 'broker-one',
      updatedAt: '2026-07-23T11:00:00.000Z',
      billingProfile: { stripeSubscriptionId: 'sub_123' },
    };

    storeMocks.resolveSupabaseQuery.mockResolvedValue({ data: supabaseRow, error: null });
    storeMocks.resolveMongoFindOne.mockResolvedValue(mongoRow);

    await expect(readSiteConfigByStripeSubscriptionId('sub_123')).resolves.toBe(mongoRow);
    expect(storeMocks.mongoFindOne).toHaveBeenCalledWith({
      'billingProfile.stripeSubscriptionId': 'sub_123',
    });
  });

  it('saves matching update timestamps to Supabase and Mongo records', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-23T12:34:56.000Z'));

    const kit = createDefaultLaunchKit('broker-one');

    await expect(saveSiteConfig(kit, { email: 'operator@example.test' })).resolves.toEqual(['supabase', 'mongo']);

    expect(storeMocks.supabaseUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ updated_at: '2026-07-23T12:34:56.000Z' }),
      { onConflict: 'agent_id' },
    );
    expect(storeMocks.mongoFindOneAndUpdate).toHaveBeenCalledWith(
      { agentId: 'broker-one' },
      expect.objectContaining({ updatedAt: '2026-07-23T12:34:56.000Z' }),
      { upsert: true, new: true },
    );
  });
});

function createSupabaseQuery() {
  const query = {
    eqs: [] as Array<{ column: string; value: unknown }>,
    filters: [] as Array<{ column: string; operator: string; value: unknown }>,
    order: null as { column: string; options: unknown } | null,
    limit: null as number | null,
  };
  const api = {
    select: vi.fn(() => api),
    eq: vi.fn((column: string, value: unknown) => {
      query.eqs.push({ column, value });
      return api;
    }),
    filter: vi.fn((column: string, operator: string, value: unknown) => {
      query.filters.push({ column, operator, value });
      return api;
    }),
    order: vi.fn((column: string, options: unknown) => {
      query.order = { column, options };
      return api;
    }),
    limit: vi.fn((limit: number) => {
      query.limit = limit;
      return api;
    }),
    maybeSingle: vi.fn(() => storeMocks.resolveSupabaseQuery(query)),
    upsert: storeMocks.supabaseUpsert,
    then: vi.fn((resolve, reject) => storeMocks.resolveSupabaseQuery(query).then(resolve, reject)),
  };

  return api;
}
