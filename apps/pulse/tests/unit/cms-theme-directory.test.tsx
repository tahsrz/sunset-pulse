import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
const navigation = vi.hoisted(() => ({ query: 'siteId=site-a' }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }), useSearchParams: () => new URLSearchParams(navigation.query) }));
import { ThemeDirectory } from '@/app/vibes/appearance/ThemeDirectory';
const themes = [
  { id: 'sunset/core', name: 'Sunset Core', version: '1.0.0', description: 'Core.', supportedBlocks: [] },
  { id: 'sunset/editorial', name: 'Editorial', version: '1.0.0', description: 'Editorial.', supportedBlocks: [] },
];
const response = (data: unknown) => ({ ok: true, text: async () => JSON.stringify(data), json: async () => data });
describe('CMS Appearance themes', () => {
  afterEach(() => { vi.unstubAllGlobals(); navigation.query = 'siteId=site-a'; });
  it('activates explicitly and re-reads authoritative catalog state', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(response({ themes, activeThemeId: 'sunset/core' }))
      .mockResolvedValueOnce(response({ activation: { themeId: 'sunset/editorial' } }))
      .mockResolvedValueOnce(response({ themes, activeThemeId: 'sunset/editorial' }));
    vi.stubGlobal('fetch', fetchMock);
    render(<ThemeDirectory />);
    fireEvent.click(await screen.findByRole('button', { name: 'Activate' }));
    expect(await screen.findByText('Theme activated.')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/vibes/themes?siteId=site-a', expect.objectContaining({ method: 'POST', body: JSON.stringify({ themeId: 'sunset/editorial' }) }));
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
  it('opens a scoped published preview without activating and handles no pages', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(response({ themes, activeThemeId: 'sunset/core' }))
      .mockResolvedValueOnce(response({ pages: [], totalPages: 0 }));
    vi.stubGlobal('fetch', fetchMock);
    render(<ThemeDirectory />);
    fireEvent.click(await screen.findByRole('button', { name: 'Preview Editorial' }));
    expect(await screen.findByText(/Publish a page to preview/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open Pages' })).toHaveAttribute('href', '/vibes/pages?siteId=site-a');
    expect(fetchMock.mock.calls.some((call) => call[1]?.method === 'POST')).toBe(false);
  });
  it('does not paint old-site results after changing scope', async () => {
    let resolveOld!: (value: unknown) => void;
    const fetchMock = vi.fn().mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve; }))
      .mockResolvedValueOnce(response({ themes: [{ ...themes[0], name: 'Site B theme' }], activeThemeId: 'sunset/core' }));
    vi.stubGlobal('fetch', fetchMock);
    const view = render(<ThemeDirectory />);
    navigation.query = 'siteId=site-b&tenantId=tenant-b';
    view.rerender(<ThemeDirectory />);
    expect(await screen.findByRole('heading', { name: 'Site B theme' })).toBeInTheDocument();
    resolveOld(response({ themes, activeThemeId: 'sunset/editorial' }));
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Editorial' })).not.toBeInTheDocument());
    expect(fetchMock).toHaveBeenLastCalledWith('/api/vibes/themes?siteId=site-b&tenantId=tenant-b', expect.anything());
  });
});
