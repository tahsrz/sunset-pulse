import React from 'react';
import Link from 'next/link';
import type { CmsPageRenderContext } from '@/lib/cms/pages/renderContext';
import { renderCmsPageBlocks } from '@/lib/cms/pages/blockRegistry';
import type { SunsetPageTemplateParts } from './SunsetPageTemplate';
import { cmsThemeStyle } from './themeStyles';
import { PresentationLinks } from './PresentationLinks';

export function EditorialHeaderPart(context: CmsPageRenderContext) {
  return <header data-cms-template-part="sunset/editorial-header" className="mx-auto max-w-6xl border-b border-current/20 px-6 py-8 text-center">
    <Link href="/" className="text-2xl tracking-tight" style={{ fontFamily: 'var(--font-family-heading, Georgia, serif)' }}>{context.page.snapshot.presentation?.siteName ?? context.siteName}</Link>
    {context.page.snapshot.presentation ? <nav aria-label={context.page.snapshot.presentation.navigationLabel} className="mt-4"><PresentationLinks links={[{ label: context.page.snapshot.presentation.homeLabel, href: '/' }, ...(context.page.snapshot.presentation.navigationLinks || [])]} /></nav> : null}
  </header>;
}

export function EditorialFooterPart(context: CmsPageRenderContext) {
  return <footer data-cms-template-part="sunset/editorial-footer" className="mx-auto mt-16 max-w-6xl whitespace-pre-wrap border-t border-current/20 px-6 py-10 text-center text-sm"><p className="mb-4">{context.page.snapshot.presentation?.footerText ?? context.siteName}</p><PresentationLinks links={context.page.snapshot.presentation?.footerLinks} /></footer>;
}

export function EditorialPageTemplate({ context, parts }: { context: CmsPageRenderContext; parts: SunsetPageTemplateParts }) {
  const snapshot = context.page.snapshot;
  return <div className="cms-theme cms-theme-editorial min-h-screen bg-[var(--color-background,#faf8f3)] text-[var(--color-text-primary,#242320)]"
    style={cmsThemeStyle(context.vibe?.cssVars)} data-cms-page-id={context.page.pageId}
    data-cms-page-revision={context.page.revisionNumber} data-cms-theme={context.theme.id} data-vibe-revision-id={context.vibe?.revisionId}>
    {parts.header(context)}
    <main className="mx-auto max-w-[46rem] px-6 py-14 sm:py-24">
      <h1 className="text-balance text-4xl leading-tight sm:text-6xl" style={{ fontFamily: 'var(--font-family-heading, Georgia, serif)', fontWeight: 'var(--font-weight-bold, 700)' }}>{snapshot.title}</h1>
      {snapshot.excerpt ? <p className="mb-12 mt-6 border-l-2 border-current/30 pl-5 text-xl leading-relaxed opacity-75">{snapshot.excerpt}</p> : null}
      <div className="mt-10 flex flex-col leading-relaxed" style={{ gap: 'calc(var(--spacing-base, 4px) * 7)' }} data-cms-page-content>
        {renderCmsPageBlocks(snapshot.blocks, { mode: 'public', registry: context.blockRegistry })}
      </div>
    </main>
    {parts.footer(context)}
  </div>;
}
