import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({ connectDB: vi.fn(), createGroup: vi.fn(), updateGroup: vi.fn(), archiveGroup: vi.fn(), restoreGroup: vi.fn() }));
vi.mock('@/lib/core/database', () => ({ default: mocks.connectDB }));
vi.mock('@/lib/cms/taxonomyRepository', () => ({ createNormalizedTaxonomyGroup: mocks.createGroup, updateNormalizedTaxonomyGroupLabel: mocks.updateGroup, archiveNormalizedTaxonomyGroup: mocks.archiveGroup, restoreNormalizedTaxonomyGroup: mocks.restoreGroup }));

import { DELETE, PATCH, POST, PUT } from '@/app/api/vibes/taxonomy/groups/route';

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

  it('updates only an active taxonomy display label', async () => {
    process.env.VIBE_TAXONOMY_MANAGE_TERMS = '1';
    process.env.VIBE_TAXONOMY_NORMALIZED_READ = '1';
    mocks.updateGroup.mockResolvedValue({ slug: 'neighborhood', label: 'Area', hierarchical: true });
    const response = await PATCH(new NextRequest('http://localhost/api/vibes/taxonomy/groups', { method: 'PATCH', body: JSON.stringify({ slug: 'neighborhood', label: 'Area' }) }));
    expect(response.status).toBe(200);
    expect(mocks.updateGroup).toHaveBeenCalledWith({ tenantId: 'default', slug: 'neighborhood', label: 'Area' });
  });

  it('archives and restores an empty taxonomy group', async () => {
    process.env.VIBE_TAXONOMY_MANAGE_TERMS = '1';
    process.env.VIBE_TAXONOMY_NORMALIZED_READ = '1';
    mocks.archiveGroup.mockResolvedValue({ slug: 'neighborhood', label: 'Neighborhood', hierarchical: true, status: 'archived' });
    mocks.restoreGroup.mockResolvedValue({ slug: 'neighborhood', label: 'Neighborhood', hierarchical: true, status: 'active' });
    const archiveResponse = await DELETE(new NextRequest('http://localhost/api/vibes/taxonomy/groups', { method: 'DELETE', body: JSON.stringify({ slug: 'neighborhood' }) }));
    const restoreResponse = await PUT(new NextRequest('http://localhost/api/vibes/taxonomy/groups', { method: 'PUT', body: JSON.stringify({ slug: 'neighborhood' }) }));
    expect(archiveResponse.status).toBe(200);
    expect(restoreResponse.status).toBe(200);
    expect(mocks.archiveGroup).toHaveBeenCalledWith({ tenantId: 'default', slug: 'neighborhood' });
    expect(mocks.restoreGroup).toHaveBeenCalledWith({ tenantId: 'default', slug: 'neighborhood' });
  });
});
