import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CmsPageEditor, type CmsPageEditorDocument } from '@/app/vibes/pages/[pageId]/edit/CmsPageEditor';

const page: CmsPageEditorDocument = {
  pageId: 'page-1', siteId: 'site-a', routePath: 'about', status: 'draft', currentDraftVersion: 2,
  draftPayload: {
    schemaVersion: 1, title: 'About', slug: 'about', excerpt: '', templateId: 'sunset/page',
    blocks: [
      { blockId: '276fd207-2f8c-44f1-a958-9cbc641c1e4c', version: 1, type: 'core/heading', props: { text: 'Welcome', level: 2 } },
      { blockId: '7cfa20a0-8b0d-41a9-816c-d42a4ea04716', version: 1, type: 'core/paragraph', props: { text: 'Our story.' } },
    ],
  },
};

describe('CMS page block canvas', () => {
  it('derives its inserter from registered core blocks and renders persisted content', () => {
    render(<CmsPageEditor page={page} pagesHref="/vibes/pages?siteId=site-a" />);
    const inserter = screen.getByRole('complementary', { name: 'Block inserter' });
    expect(within(inserter).getAllByRole('button').map((button) => button.textContent)).toEqual(['+ Heading', '+ Paragraph', '+ Image', '+ Button']);
    expect(screen.getByRole('heading', { name: 'Welcome' })).toBeInTheDocument();
    expect(screen.getByText('Our story.')).toBeInTheDocument();
  });

  it('inserts, reorders, duplicates, and deletes blocks locally', () => {
    render(<CmsPageEditor page={page} pagesHref="/vibes/pages?siteId=site-a" />);
    fireEvent.click(screen.getByRole('button', { name: '+ Paragraph' }));
    expect(screen.getByText('3 blocks')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('local changes');

    fireEvent.click(screen.getAllByRole('button', { name: 'Duplicate core/heading' })[0]);
    expect(screen.getAllByRole('heading', { name: 'Welcome' })).toHaveLength(2);
    fireEvent.click(screen.getAllByRole('button', { name: 'Move core/paragraph up' })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: 'Delete core/heading' })[0]);
    expect(screen.getByText('3 blocks')).toBeInTheDocument();
  });
});
