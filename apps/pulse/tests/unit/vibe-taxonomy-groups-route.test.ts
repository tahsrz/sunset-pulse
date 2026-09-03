import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({ connectDB: vi.fn(), createGroup: vi.fn() }));
vi.mock('@/lib/core/database', () => ({ default: mocks.connectDB }));
vi.mock('@/lib/cms/taxonomyRepository', () => ({ createNormalizedTaxonomyGroup: mocks.createGroup }));

import { POST } from '@/app/api/vibes/taxonomy/groups/route';

describe('taxonomy group management route', () => {
  afterEach(() => {
    delete process.env.VIBE_TAXONOMY_MANAGE_TERMS;
    delete process.env.VIBE_TAXONOMY_NORMALIZED_READ;
    vi.clearAllMocks();
  });

  it('creates a normalized taxonomy group when management is enabled', async () => {
    process.env.VIBE_TAXONOMY_MANAGE_TERMS = '1';
    process.env.VIBE_TAXONOMY_NORMALIZED_READ = '1';
    mocks.createGroup.mockResolvedValue({ slug: 'neighborhood', label: 'Neighborhood', hierarchical: true });
    const response = await POST(new NextRequest('http://localhost/api/vibes/taxonomy/groups', { method: 'POST', body: JSON.stringify({ slug: 'neighborhood', label: 'Neighborhood', hierarchical: true }) }));
    expect(response.status).toBe(201);
    expect(mocks.createGroup).toHaveBeenCalledWith({ tenantId: 'default', slug: 'neighborhood', label: 'Neighborhood', hierarchical: true });
  });

  it('keeps group creation unavailable before normalized management cutover', async () => {
    const response = await POST(new NextRequest('http://localhost/api/vibes/taxonomy/groups', { method: 'POST', body: '{}' }));
    expect(response.status).toBe(404);
    expect(mocks.createGroup).not.toHaveBeenCalled();
  });
});
