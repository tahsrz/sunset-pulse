import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  connectDB: vi.fn(),
  countEmbedded: vi.fn(),
  countNormalized: vi.fn(),
  listNormalized: vi.fn(),
}));

vi.mock('@/lib/core/database', () => ({ default: mocks.connectDB }));
vi.mock('@/lib/cms/taxonomyRepository', () => ({
  countEmbeddedTaxonomyUsage: mocks.countEmbedded,
  countNormalizedTaxonomyUsage: mocks.countNormalized,
  listNormalizedTaxonomyTerms: mocks.listNormalized,
}));

import { GET } from '@/app/api/vibes/taxonomy/route';

describe('taxonomy directory read authority', () => {
  afterEach(() => {
    delete process.env.VIBE_TAXONOMY_COMPARE_READS;
    delete process.env.VIBE_TAXONOMY_NORMALIZED_READ;
    vi.clearAllMocks();
  });

  it('uses embedded counts by default without querying normalized relationships', async () => {
    mocks.countEmbedded.mockResolvedValue({ 'mood:calm': 2 });
    const response = await GET(new NextRequest('http://localhost/api/vibes/taxonomy?tenantId=tenant-a'));
    expect(await response.json()).toMatchObject({ counts: { 'mood:calm': 2 } });
    expect(mocks.countEmbedded).toHaveBeenCalledWith('tenant-a');
    expect(mocks.countNormalized).not.toHaveBeenCalled();
  });

  it('compares normalized counts while returning embedded counts', async () => {
    process.env.VIBE_TAXONOMY_COMPARE_READS = '1';
    mocks.countEmbedded.mockResolvedValue({ 'mood:calm': 2 });
    mocks.countNormalized.mockResolvedValue({ 'mood:calm': 2 });
    mocks.listNormalized.mockResolvedValue([{ id: 'mood:calm', group: 'mood', term: 'calm' }]);
    const response = await GET(new NextRequest('http://localhost/api/vibes/taxonomy'));
    expect(await response.json()).toMatchObject({ counts: { 'mood:calm': 2 } });
    expect(mocks.countNormalized).toHaveBeenCalledWith('default');
  });

  it('returns normalized counts without changing the response shape at cutover', async () => {
    process.env.VIBE_TAXONOMY_NORMALIZED_READ = '1';
    mocks.countEmbedded.mockResolvedValue({ 'mood:calm': 1 });
    mocks.countNormalized.mockResolvedValue({ 'mood:calm': 2 });
    const response = await GET(new NextRequest('http://localhost/api/vibes/taxonomy'));
    const payload = await response.json();
    expect(payload.counts).toEqual({ 'mood:calm': 2 });
    expect(payload.terms).toEqual([{ id: 'mood:calm', group: 'mood', term: 'calm' }]);
  });
});
