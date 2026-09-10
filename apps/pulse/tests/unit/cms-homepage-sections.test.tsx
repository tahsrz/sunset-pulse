import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { homepageSectionSchema } from '@/lib/cms/pages/homepageSectionSchema';
import { createCmsEditorBlock } from '@/lib/cms/pages/editorBlocks';
import { HomepageSection } from '@/lib/cms/pages/HomepageSection';
import { PreviewInteractions } from '@/app/cms-preview/PreviewInteractions';
import { CmsPageEditor } from '@/app/vibes/pages/[pageId]/edit/CmsPageEditor';
import { cmsPageDraftSchema } from '@/lib/cms/pages/pageSchema';
import { vi } from 'vitest';
vi.mock('@/app/vibes/pages/[pageId]/edit/CmsPageRevisions', () => ({ CmsPageRevisions: () => null }));

describe('Editable homepage sections', () => {
  it('creates a valid section and renders authored questions and answers in preview', () => {
    const initial = homepageSectionSchema.parse(createCmsEditorBlock('sunset/section'));
    const block = { ...initial, props: { ...initial.props, layout: 'faq' as const, heading: 'Your questions', items: [{ title: 'Can I visit?', text: 'Choose a time that works for you.', linkLabel: 'Find out more', href: '/properties' }] } };
    render(<PreviewInteractions><HomepageSection block={block} /></PreviewInteractions>);
    expect(screen.getByText('Can I visit?')).toBeInTheDocument();
    expect(screen.getByText('Choose a time that works for you.')).toBeInTheDocument();
    const link = screen.getByText('Find out more');
    expect(fireEvent.click(link)).toBe(false);
    expect(document.querySelector('[inert]')).toBeNull();
  });
  it('edits section text and item copy through fields while preserving draft identity', () => {
    const initial = homepageSectionSchema.parse(createCmsEditorBlock('sunset/section'));
    render(<CmsPageEditor page={{ pageId: 'p', siteId: 's', status: 'draft', currentDraftVersion: 0,
      draftPayload: cmsPageDraftSchema.parse({ title: 'Home', slug: 'home', blocks: [initial] }),
    }} pagesHref="/vibes/pages?siteId=s" />);
    fireEvent.click(screen.getByRole('button', { name: 'Homepage section · Select' }));
    fireEvent.change(screen.getByLabelText('Section heading'), { target: { value: 'Explore North Texas' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add item' }));
    fireEvent.change(screen.getByLabelText('Title or question'), { target: { value: 'Find homes' } });
    expect(screen.getByRole('heading', { name: 'Explore North Texas' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Find homes' })).toBeInTheDocument();
    expect(screen.getByText(/Unsaved changes/)).toBeInTheDocument();
  });
});
