import { describe, expect, it } from 'vitest';
import { metadataForCmsPage } from '@/lib/cms/pages/publicPageResolver';
import type { CmsPageRenderContext } from '@/lib/cms/pages/renderContext';

function context(slug: string, excerpt = 'Local guidance for buyers and sellers.') {
  return {
    siteName: 'Taz Realty',
    page: { snapshot: { title: 'About Taz', slug, excerpt } },
  } as unknown as CmsPageRenderContext;
}

describe('CMS page metadata', () => {
  it('uses the immutable page snapshot for title, description, canonical, and Open Graph data', () => {
    expect(metadataForCmsPage(context('about'))).toEqual({
      title: 'About Taz | Taz Realty',
      description: 'Local guidance for buyers and sellers.',
      alternates: { canonical: '/about' },
      openGraph: {
        title: 'About Taz | Taz Realty',
        description: 'Local guidance for buyers and sellers.',
        type: 'website',
        url: '/about',
      },
    });
  });

  it('uses the root canonical for the conventional home page', () => {
    expect(metadataForCmsPage(context('home')).alternates).toEqual({ canonical: '/' });
  });

  it('provides a stable description when the optional excerpt is empty', () => {
    expect(metadataForCmsPage(context('about', '')).description).toBe('About Taz from Taz Realty.');
  });
});
