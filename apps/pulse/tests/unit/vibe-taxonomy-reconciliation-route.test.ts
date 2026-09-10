import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  connectDB: vi.fn(),
  countEmbedded: vi.fn(),
  countNormalized: vi.fn(),
}));

vi.mock('@/lib/core/database', () => ({ default: mocks.connectDB }));
vi.mock('@/lib/cms/taxonomyRepository', () => ({
  countEmbeddedTaxonomyUsage: mocks.countEmbedded,
  countNormalizedTaxonomyUsage: mocks.countNormalized,
}));

import { GET } from '@/app/api/vibes/taxonomy/reconciliation/route';

describe('taxonomy reconciliation route', () => {
  afterEach(() => {
    delete process.env.VIBE_TAXONOMY_COMPARE_READS;
    vi.clearAllMocks();
  });

  it('returns not found while reconciliation is disabled', async () => {
    const response = await GET(new NextRequest('http://localhost/api/vibes/taxonomy/reconciliation'));
    expect(response.status).toBe(404);
    expect(mocks.connectDB).not.toHaveBeenCalled();
  });

  it('returns a tenant-scoped agreement report when enabled', async () => {
    process.env.VIBE_TAXONOMY_COMPARE_READS = '1';
    mocks.countEmbedded.mockResolvedValue({ 'mood:calm': 2 });
    mocks.countNormalized.mockResolvedValue({ 'mood:calm': 2 });
    const response = await GET(new NextRequest('http://localhost/api/vibes/taxonomy/reconciliation?tenantId=tenant-a'));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ tenantId: 'tenant-a', state: 'agrees', mismatchTermIds: [] });
    expect(mocks.countEmbedded).toHaveBeenCalledWith('tenant-a');
    expect(mocks.countNormalized).toHaveBeenCalledWith('tenant-a');
  });
});
