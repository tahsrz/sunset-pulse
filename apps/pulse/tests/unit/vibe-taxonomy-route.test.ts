import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  connectDB: vi.fn(),
  countEmbedded: vi.fn(),
  countNormalized: vi.fn(),
  listNormalized: vi.fn(),
  listGroups: vi.fn(),
  createTerm: vi.fn(),
  updateTermLabel: vi.fn(),
  archiveTerm: vi.fn(),
  restoreTerm: vi.fn(),
}));

vi.mock('@/lib/core/database', () => ({ default: mocks.connectDB }));
vi.mock('@/lib/cms/taxonomyRepository', () => ({
  countEmbeddedTaxonomyUsage: mocks.countEmbedded,
  countNormalizedTaxonomyUsage: mocks.countNormalized,
  listNormalizedTaxonomyTerms: mocks.listNormalized,
  listNormalizedTaxonomyGroups: mocks.listGroups,
  createNormalizedTaxonomyTerm: mocks.createTerm,
  updateNormalizedTaxonomyTermLabel: mocks.updateTermLabel,
  archiveNormalizedTaxonomyTerm: mocks.archiveTerm,
  restoreNormalizedTaxonomyTerm: mocks.restoreTerm,
}));

import { DELETE, GET, PATCH, POST, PUT } from '@/app/api/vibes/taxonomy/route';

describe('taxonomy directory read authority', () => {
  afterEach(() => {
    delete process.env.VIBE_TAXONOMY_COMPARE_READS;
    delete process.env.VIBE_TAXONOMY_NORMALIZED_READ;
    delete process.env.VIBE_TAXONOMY_MANAGE_TERMS;
    vi.clearAllMocks();
  });

  it('keeps term creation unavailable until management is enabled', async () => {
    const response = await POST(new NextRequest('http://localhost/api/vibes/taxonomy', { method: 'POST', body: JSON.stringify({ group: 'mood', term: 'focused', label: 'Focused' }) }));
    expect(response.status).toBe(404);
    expect(mocks.createTerm).not.toHaveBeenCalled();
  });

  it('creates a validated normalized term when management is enabled', async () => {
    process.env.VIBE_TAXONOMY_MANAGE_TERMS = '1';
    mocks.createTerm.mockResolvedValue({ id: 'mood:focused', group: 'mood', term: 'focused', label: 'Focused' });
    const response = await POST(new NextRequest('http://localhost/api/vibes/taxonomy', { method: 'POST', body: JSON.stringify({ tenantId: 'tenant-a', group: 'mood', term: 'focused', label: 'Focused' }), headers: { 'content-type': 'application/json' } }));
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ term: { id: 'mood:focused', group: 'mood', term: 'focused', label: 'Focused' } });
    expect(mocks.createTerm).toHaveBeenCalledWith({ tenantId: 'tenant-a', group: 'mood', term: 'focused', label: 'Focused' });
  });

  it('passes an optional parent slug for hierarchical terms', async () => {
    process.env.VIBE_TAXONOMY_MANAGE_TERMS = '1';
    mocks.createTerm.mockResolvedValue({ id: 'neighborhood:downtown-east', group: 'neighborhood', term: 'downtown-east', label: 'Downtown East', parentId: 'neighborhood:downtown' });
    const response = await POST(new NextRequest('http://localhost/api/vibes/taxonomy', { method: 'POST', body: JSON.stringify({ group: 'neighborhood', term: 'downtown-east', label: 'Downtown East', parentTerm: 'downtown' }) }));
    expect(response.status).toBe(201);
    expect(mocks.createTerm).toHaveBeenCalledWith({ tenantId: 'default', group: 'neighborhood', term: 'downtown-east', label: 'Downtown East', parentTerm: 'downtown' });
  });

  it('passes an optional operator-facing term description', async () => {
    process.env.VIBE_TAXONOMY_MANAGE_TERMS = '1';
    mocks.createTerm.mockResolvedValue({ id: 'mood:focused', group: 'mood', term: 'focused', label: 'Focused', description: 'For concentrated editorial layouts.' });
    const response = await POST(new NextRequest('http://localhost/api/vibes/taxonomy', { method: 'POST', body: JSON.stringify({ group: 'mood', term: 'focused', label: 'Focused', description: 'For concentrated editorial layouts.' }) }));
    expect(response.status).toBe(201);
    expect(mocks.createTerm).toHaveBeenCalledWith({ tenantId: 'default', group: 'mood', term: 'focused', label: 'Focused', description: 'For concentrated editorial layouts.' });
  });

  it('updates editable term metadata without changing identity', async () => {
    process.env.VIBE_TAXONOMY_MANAGE_TERMS = '1';
    mocks.updateTermLabel.mockResolvedValue({ id: 'mood:focused', group: 'mood', term: 'focused', label: 'Deep Focus' });
    const response = await PATCH(new NextRequest('http://localhost/api/vibes/taxonomy', { method: 'PATCH', body: JSON.stringify({ group: 'mood', term: 'focused', label: 'Deep Focus', description: 'For concentrated layouts.' }) }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ term: { id: 'mood:focused', group: 'mood', term: 'focused', label: 'Deep Focus' } });
    expect(mocks.updateTermLabel).toHaveBeenCalledWith({ tenantId: 'default', group: 'mood', term: 'focused', label: 'Deep Focus', description: 'For concentrated layouts.' });
  });

  it('archives a term without deleting its compatibility identity', async () => {
    process.env.VIBE_TAXONOMY_MANAGE_TERMS = '1';
    mocks.archiveTerm.mockResolvedValue({ id: 'mood:focused', group: 'mood', term: 'focused', label: 'Focused', status: 'archived' });
    const response = await DELETE(new NextRequest('http://localhost/api/vibes/taxonomy', { method: 'DELETE', body: JSON.stringify({ group: 'mood', term: 'focused' }) }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ term: { id: 'mood:focused', status: 'archived' } });
    expect(mocks.archiveTerm).toHaveBeenCalledWith({ tenantId: 'default', group: 'mood', term: 'focused' });
  });

  it('restores the same archived term identity', async () => {
    process.env.VIBE_TAXONOMY_MANAGE_TERMS = '1';
    mocks.restoreTerm.mockResolvedValue({ id: 'mood:focused', group: 'mood', term: 'focused', label: 'Focused' });
    const response = await PUT(new NextRequest('http://localhost/api/vibes/taxonomy', { method: 'PUT', body: JSON.stringify({ group: 'mood', term: 'focused' }) }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ term: { id: 'mood:focused', group: 'mood', term: 'focused', label: 'Focused' } });
    expect(mocks.restoreTerm).toHaveBeenCalledWith({ tenantId: 'default', group: 'mood', term: 'focused' });
  });

  it('uses embedded counts by default without querying normalized relationships', async () => {
    mocks.countEmbedded.mockResolvedValue({ 'mood:calm': 2 });
    const response = await GET(new NextRequest('http://localhost/api/vibes/taxonomy?tenantId=tenant-a'));
    expect(await response.json()).toMatchObject({
      counts: { 'mood:calm': 2 },
      capabilities: { manageTerms: false },
    });
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

  it('advertises management only when normalized reads and term management are both enabled', async () => {
    process.env.VIBE_TAXONOMY_NORMALIZED_READ = '1';
    process.env.VIBE_TAXONOMY_MANAGE_TERMS = '1';
    mocks.countEmbedded.mockResolvedValue({});
    mocks.countNormalized.mockResolvedValue({});
    mocks.listNormalized.mockResolvedValue([]);

    const response = await GET(new NextRequest('http://localhost/api/vibes/taxonomy'));

    expect(await response.json()).toMatchObject({ capabilities: { manageTerms: true } });
    expect(mocks.listNormalized).toHaveBeenCalledWith('default', false);
  });

  it('includes archived catalog terms only for the enabled management directory', async () => {
    process.env.VIBE_TAXONOMY_NORMALIZED_READ = '1';
    process.env.VIBE_TAXONOMY_MANAGE_TERMS = '1';
    mocks.countEmbedded.mockResolvedValue({});
    mocks.countNormalized.mockResolvedValue({});
    mocks.listNormalized.mockResolvedValue([]);
    mocks.listGroups.mockResolvedValue([{ slug: 'mood', label: 'Mood', hierarchical: false }]);
    await GET(new NextRequest('http://localhost/api/vibes/taxonomy?includeArchived=1'));
    expect(mocks.listNormalized).toHaveBeenCalledWith('default', true);
    expect(mocks.listGroups).toHaveBeenCalledWith('default');
  });
});
