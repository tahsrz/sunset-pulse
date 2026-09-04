import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { assertBundledThemeRuntimeCompleteness, createCmsThemeRuntimeRegistry, renderCmsThemePage } from '@/lib/cms/themes/runtimeRegistry';
import type { CmsPageRenderContext } from '@/lib/cms/pages/renderContext';

describe('CMS theme runtime registry', () => {
  it('rejects duplicate runtime IDs and covers every bundled manifest entry', () => {
    expect(() => createCmsThemeRuntimeRegistry({ templates: [{ id: 'test/page', render: () => null }, { id: 'test/page', render: () => null }] })).toThrow('DUPLICATE_THEME_TEMPLATE_RUNTIME:test/page');
    expect(assertBundledThemeRuntimeCompleteness).not.toThrow();
  });

  it('renders the page snapshot template through the active theme runtime', () => {
    const context = {
      siteName: 'Runtime Realty',
      page: { pageId: 'page-id', revisionNumber: 1, snapshot: { title: 'Runtime page', excerpt: '', templateId: 'sunset/page', blocks: [] } },
      theme: { id: 'sunset/core', templates: { page: 'sunset/page' }, templateParts: { header: 'sunset/header', footer: 'sunset/footer' } },
      plugins: [], diagnostics: [], blockRegistry: { definitions: [], get: () => undefined },
    } as unknown as CmsPageRenderContext;
    const html = renderToStaticMarkup(<>{renderCmsThemePage(context)}</>);
    expect(html).toContain('Runtime page');
    expect(html).toContain('data-cms-template-part="sunset/header"');
  });

  it('falls back to the active theme default for an undeclared snapshot template', () => {
    const registry = createCmsThemeRuntimeRegistry({ templates: [{ id: 'test/page', render: () => <p>Fallback template</p> }] });
    const context = { page: { snapshot: { templateId: 'other/page' } }, theme: { templates: { page: 'test/page' } } } as unknown as CmsPageRenderContext;
    expect(renderToStaticMarkup(<>{renderCmsThemePage(context, registry)}</>)).toContain('Fallback template');
  });
});
