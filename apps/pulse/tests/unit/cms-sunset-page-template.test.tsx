import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { SunsetPageTemplate } from '@/lib/cms/themes/SunsetPageTemplate';
import type { CmsPageRenderContext } from '@/lib/cms/pages/renderContext';

const context = {
  requestId: 'request-id',
  tenantId: 'tenant-id',
  siteId: 'site-id',
  siteName: 'Agent Realty',
  hostname: 'agent.sunsetpulse.app',
  page: {
    pageId: 'page-id',
    routePath: 'about',
    revisionNumber: 4,
    snapshot: {
      schemaVersion: 1,
      title: 'About the team',
      slug: 'about',
      excerpt: 'Local knowledge and direct guidance.',
      templateId: 'sunset/page',
      blocks: [{ blockId: '276fd207-2f8c-44f1-a958-9cbc641c1e4c', version: 1, type: 'core/paragraph', props: { text: 'We know North Texas.' } }],
    },
  },
  theme: { id: 'sunset/core', name: 'Sunset Core', version: '1.0.0', description: 'Core.', author: 'Sunset Pulse', templates: { page: 'sunset/page' }, templateParts: { header: 'sunset/header', footer: 'sunset/footer' }, supportedBlocks: [] },
  vibe: { revisionId: 'vibe-revision-id', vibeId: 'vibe-id', revisionNumber: 3, cssVars: { '--color-background': '#fafafa', '--color-text-primary': '#111111' } },
  plugins: [],
  diagnostics: [],
} as unknown as CmsPageRenderContext;

describe('Sunset page template', () => {
  it('renders only the pinned page snapshot with theme and Vibe traceability', () => {
    const html = renderToStaticMarkup(<SunsetPageTemplate context={context} />);
    expect(html).toContain('data-cms-page-id="page-id"');
    expect(html).toContain('data-cms-page-revision="4"');
    expect(html).toContain('data-cms-theme="sunset/core"');
    expect(html).toContain('data-vibe-revision-id="vibe-revision-id"');
    expect(html).toContain('About the team');
    expect(html).toContain('We know North Texas.');
    expect(html).toContain('--color-background:#fafafa');
    expect(html).toContain('font-family:var(--font-family-body, inherit)');
    expect(html).toContain('data-cms-template-part="sunset/header"');
    expect(html).toContain('data-cms-template-part="sunset/footer"');
    expect(html).toContain('Agent Realty');
  });
});
