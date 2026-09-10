import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('@/app/vibes/pages/[pageId]/edit/CmsPageRevisions', () => ({ CmsPageRevisions: () => null }));
import { CmsPageEditorLoader } from '@/app/vibes/pages/[pageId]/edit/CmsPageEditorLoader';

let query = 'siteId=site-a';
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams(query) }));
vi.mock('next/link', () => ({ default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a href={String(href)} {...props}>{children}</a> }));

const page = {
  pageId: 'page-1', siteId: 'site-a', routePath: 'about', status: 'draft', currentDraftVersion: 3,
  draftPayload: { schemaVersion: 1, title: 'About', slug: 'about', excerpt: '', templateId: 'sunset/page', blocks: [] },
};

describe('CMS page editor load boundary', () => {
  beforeEach(() => { query = 'siteId=site-a'; });
  afterEach(() => vi.unstubAllGlobals());
  it('carries an explicit tenant scope into loading and subsequent saves', async () => {
    query = 'siteId=site-a&tenantId=platform';
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => JSON.stringify({ page: { ...page, tenantId: 'platform' } }) });
    vi.stubGlobal('fetch', fetchMock);
    render(<CmsPageEditorLoader pageId="page-1" />);
    await screen.findByRole('heading', { name: 'About', level: 1 });
    expect(fetchMock).toHaveBeenCalledWith('/api/vibes/pages/page-1?siteId=site-a&tenantId=platform', expect.anything());
    expect(screen.getByRole('link', { name: /All Pages/ })).toHaveAttribute('href', '/vibes/pages?siteId=site-a&tenantId=platform');
    fireEvent.change(screen.getByRole('textbox', { name: 'Title' }), { target: { value: 'New homepage' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/vibes/pages/page-1?siteId=site-a&tenantId=platform', expect.objectContaining({ method: 'PATCH' })));
  });

  it('loads the current draft and document summary', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => JSON.stringify({ page }) }));
    render(<CmsPageEditorLoader pageId="page-1" />);
    expect(await screen.findByRole('heading', { name: 'About', level: 1 })).toBeInTheDocument();
    expect(screen.getByText('Start building this page')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('does not request a page when site scope is missing', () => {
    query = '';
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    render(<CmsPageEditorLoader pageId="page-1" />);
    expect(screen.getByRole('heading', { name: 'Choose a site first' })).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('distinguishes not-found and malformed successful responses', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 404, text: async () => JSON.stringify({ error: 'That page no longer exists.' }) })
      .mockResolvedValueOnce({ ok: true, status: 200, text: async () => '' });
    vi.stubGlobal('fetch', fetchMock);
    render(<CmsPageEditorLoader pageId="missing" />);
    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
    expect(screen.getByText('That page no longer exists.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('heading', { name: 'Page could not be opened' })).toBeInTheDocument();
  });

  it('retries a recoverable request failure', async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new Error('Network unavailable'))
      .mockResolvedValueOnce({ ok: true, status: 200, text: async () => JSON.stringify({ page }) });
    vi.stubGlobal('fetch', fetchMock);
    render(<CmsPageEditorLoader pageId="page-1" />);
    expect(await screen.findByText('Network unavailable')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'About', level: 1 })).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
