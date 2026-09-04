import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
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
  afterEach(() => vi.unstubAllGlobals());
  it('derives its inserter from registered core blocks and renders persisted content', () => {
    render(<CmsPageEditor page={page} pagesHref="/vibes/pages?siteId=site-a" />);
    const inserter = screen.getByRole('complementary', { name: 'Block inserter' });
    expect(within(inserter).getAllByRole('button').map((button) => button.textContent)).toEqual(['+ Heading', '+ Paragraph', '+ Image', '+ Button']);
    expect(screen.getByRole('textbox', { name: 'Heading text' })).toHaveValue('Welcome');
    expect(screen.getByRole('textbox', { name: 'Paragraph text' })).toHaveValue('Our story.');
  });

  it('inserts, reorders, duplicates, and deletes blocks locally', () => {
    render(<CmsPageEditor page={page} pagesHref="/vibes/pages?siteId=site-a" />);
    fireEvent.click(screen.getByRole('button', { name: '+ Paragraph' }));
    expect(screen.getByText('3 blocks')).toBeInTheDocument();
    expect(screen.getByText(/Unsaved changes/)).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Duplicate core/heading' })[0]);
    expect(screen.getAllByRole('textbox', { name: 'Heading text' })).toHaveLength(2);
    fireEvent.click(screen.getAllByRole('button', { name: 'Move core/paragraph up' })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: 'Delete core/heading' })[0]);
    expect(screen.getByText('3 blocks')).toBeInTheDocument();
  });

  it('keeps document settings separate from selected block settings', () => {
    render(<CmsPageEditor page={page} pagesHref="/vibes/pages?siteId=site-a" />);
    expect(screen.getByRole('tabpanel', { name: 'Document settings' })).toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: 'Title' }), { target: { value: 'Our Company' } });
    expect(screen.getByRole('heading', { name: 'Our Company', level: 1 })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Heading · Select' }));
    expect(screen.getByRole('tabpanel', { name: 'Block settings' })).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Title' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox', { name: 'Level' }), { target: { value: '3' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'HTML anchor' }), { target: { value: 'welcome' } });
    expect(screen.getByRole('combobox', { name: 'Level' })).toHaveValue('3');
  });

  it('edits heading and paragraph text directly in the canvas', () => {
    render(<CmsPageEditor page={page} pagesHref="/vibes/pages?siteId=site-a" />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Heading text' }), { target: { value: 'Meet the team' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Paragraph text' }), { target: { value: 'People make the difference.' } });
    expect(screen.getByRole('textbox', { name: 'Heading text' })).toHaveValue('Meet the team');
    expect(screen.getByRole('textbox', { name: 'Paragraph text' })).toHaveValue('People make the difference.');
    expect(screen.getByText(/Unsaved changes/)).toBeInTheDocument();
  });

  it('saves with the expected version, then previews and publishes server-held content', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, text: async () => JSON.stringify({ page: { currentDraftVersion: 3 } }) })
      .mockResolvedValueOnce({ ok: true, status: 200, text: async () => JSON.stringify({ preview: { draftPayload: page.draftPayload } }) })
      .mockResolvedValueOnce({ ok: true, status: 201, text: async () => JSON.stringify({ revision: { revisionNumber: 1 } }) });
    vi.stubGlobal('fetch', fetchMock);
    render(<CmsPageEditor page={page} pagesHref="/vibes/pages?siteId=site-a" />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Title' }), { target: { value: 'Updated About' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    expect(await screen.findByText('Draft saved.')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenLastCalledWith('/api/vibes/pages/page-1?siteId=site-a', expect.objectContaining({ method: 'PATCH', body: expect.stringContaining('"expectedVersion":2') }));
    expect(screen.getByText(/Version 3/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
    expect(await screen.findByRole('region', { name: 'Saved draft preview' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Publish' }));
    expect(await screen.findByText('Page published.')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenLastCalledWith('/api/vibes/pages/page-1/publish?siteId=site-a', expect.objectContaining({ body: JSON.stringify({ expectedVersion: 3 }) }));
  });

  it('surfaces an optimistic save conflict without clearing local changes', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 409, text: async () => JSON.stringify({ error: 'Page changed since it was loaded.' }) }));
    render(<CmsPageEditor page={page} pagesHref="/vibes/pages?siteId=site-a" />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Heading text' }), { target: { value: 'Conflicting edit' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Page changed since it was loaded.');
    expect(screen.getByRole('button', { name: 'Reload page' })).toBeInTheDocument();
    expect(screen.getByText(/Unsaved changes/)).toBeInTheDocument();
  });
});
