import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { metadataForCmsPage, resolveTenantCmsRoute } from '@/lib/cms/pages/publicPageResolver';
import { SunsetPageTemplate } from '@/lib/cms/themes/SunsetPageTemplate';
import { coreCmsBlockRegistry } from '@/lib/cms/pages/blockRegistry';
import type { CmsPageRenderContext } from '@/lib/cms/pages/renderContext';

const context = {
  requestId: 'request-id', tenantId: 'tenant-id', siteId: 'site-id', siteName: 'Agent Realty', hostname: 'agent.sunsetpulse.app',
  page: { pageId: 'page-id', routePath: 'about/team', revisionNumber: 7, snapshot: {
    schemaVersion: 1, title: 'Our Team', slug: 'team', excerpt: 'Meet the local team.', templateId: 'sunset/page',
    blocks: [{ blockId: '276fd207-2f8c-44f1-a958-9cbc641c1e4c', version: 1, type: 'core/paragraph', props: { text: 'Published revision seven.' } }],
  } },
  theme: { id: 'sunset/core' }, vibe: null, plugins: [], blockRegistry: coreCmsBlockRegistry, diagnostics: [],
} as unknown as CmsPageRenderContext;

describe('tenant CMS route integration', () => {
  it('falls through to the legacy homepage when no published CMS home exists', async () => {
    const resolvePage = vi.fn().mockResolvedValue({ ok: false, error: { code: 'PAGE_NOT_FOUND' } });
    await expect(resolveTenantCmsRoute({ tenantHost: 'agent.sunsetpulse.app', path: [] }, { resolvePage }))
      .resolves.toEqual({ kind: 'legacy' });
    expect(resolvePage).toHaveBeenCalledWith('agent.sunsetpulse.app', 'home');
  });

  it('gives reserved and malformed routes precedence without querying CMS', async () => {
    const resolvePage = vi.fn();
    await expect(resolveTenantCmsRoute({ tenantHost: 'agent.sunsetpulse.app', path: ['properties', 'listing-id'] }, { resolvePage }))
      .resolves.toEqual({ kind: 'legacy' });
    await expect(resolveTenantCmsRoute({ tenantHost: 'agent.sunsetpulse.app', path: ['bad%escape'] }, { resolvePage }))
      .resolves.toEqual({ kind: 'legacy' });
    expect(resolvePage).not.toHaveBeenCalled();
  });

  it('uses one pinned context for nested metadata and visible content', async () => {
    const resolvePage = vi.fn().mockResolvedValue({ ok: true, context });
    const route = await resolveTenantCmsRoute({ tenantHost: 'agent.sunsetpulse.app', path: ['about', 'team'] }, { resolvePage });
    expect(route.kind).toBe('cms');
    if (route.kind !== 'cms') throw new Error('Expected CMS route');
    const metadata = metadataForCmsPage(route.context);
    const html = renderToStaticMarkup(<SunsetPageTemplate context={route.context} />);
    expect(metadata).toMatchObject({ title: 'Our Team | Agent Realty', alternates: { canonical: '/about/team' } });
    expect(html).toContain('Our Team');
    expect(html).toContain('Published revision seven.');
    expect(html).toContain('data-cms-page-revision="7"');
    expect(resolvePage).toHaveBeenCalledOnce();
  });
});
