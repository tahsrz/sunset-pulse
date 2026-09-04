import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PageDirectory } from '@/app/vibes/pages/PageDirectory';
import NewPageRoute from '@/app/vibes/pages/new/page';

const push = vi.fn();
let query = 'siteId=site-a';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams(query),
}));
vi.mock('next/link', () => ({ default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a href={String(href)} {...props}>{children}</a> }));

describe('CMS page identity UI', () => {
  beforeEach(() => { push.mockReset(); query = 'siteId=site-a'; });
  afterEach(() => vi.unstubAllGlobals());

  it('loads a site-scoped empty directory without parsing an empty body as JSON', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: async () => '' });
    vi.stubGlobal('fetch', fetchMock);
    render(<PageDirectory />);

    expect(await screen.findByText('No pages found.')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/vibes/pages?siteId=site-a&pageSize=100', expect.objectContaining({ signal: expect.any(AbortSignal) }));
    expect(screen.getByRole('link', { name: 'Add New Page' })).toHaveAttribute('href', '/vibes/pages/new?siteId=site-a');
  });

  it('applies search through the URL rather than fetching for each typed character', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: async () => JSON.stringify({ pages: [] }) });
    vi.stubGlobal('fetch', fetchMock);
    render(<PageDirectory />);
    await screen.findByText('No pages found.');
    fireEvent.change(screen.getByRole('textbox', { name: 'Search pages' }), { target: { value: 'About us' } });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    expect(push).toHaveBeenCalledWith('/vibes/pages?siteId=site-a&search=About+us');
  });

  it('creates a page with a generated slug and returns to the directory', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({ pages: [] }) })
      .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({ page: { pageId: 'page-1' } }) });
    vi.stubGlobal('fetch', fetchMock);
    render(<NewPageRoute />);
    fireEvent.change(await screen.findByRole('textbox', { name: 'Title' }), { target: { value: 'About Our Team' } });
    expect(screen.getByRole('textbox', { name: 'URL slug' })).toHaveValue('about-our-team');
    fireEvent.click(screen.getByRole('button', { name: 'Create Page' }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/vibes/pages?siteId=site-a&created=page-1'));
    expect(fetchMock).toHaveBeenLastCalledWith('/api/vibes/pages?siteId=site-a', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ title: 'About Our Team', slug: 'about-our-team' }),
    }));
  });
});
