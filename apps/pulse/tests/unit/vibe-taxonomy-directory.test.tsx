import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TaxonomyDirectory } from '@/app/vibes/taxonomy/TaxonomyDirectory';

describe('Vibe taxonomy directory', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('renders normalized-compatible terms in a compact management table', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        terms: [{ id: 'mood:calm', group: 'mood', term: 'calm' }],
        counts: { 'mood:calm': 2 },
      }),
    }));
    render(<TaxonomyDirectory />);
    await waitFor(() => expect(screen.getByRole('table')).toBeInTheDocument());
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Slug' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Group' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Vibes' })).toBeInTheDocument();
    expect(screen.getByRole('rowheader', { name: 'calm' })).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('shows term creation controls only when the API enables management', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          terms: [{ id: 'mood:calm', group: 'mood', term: 'calm' }],
          counts: {},
          capabilities: { manageTerms: true },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ term: { id: 'mood:focused', group: 'mood', term: 'focused' } }),
      });
    vi.stubGlobal('fetch', fetchMock);
    render(<TaxonomyDirectory />);
    const addButton = await screen.findByRole('button', { name: 'Add New Term' });
    fireEvent.change(screen.getByRole('textbox', { name: 'Name' }), { target: { value: 'Focused' } });
    expect(screen.getByRole('textbox', { name: 'Slug' })).toHaveValue('focused');
    fireEvent.change(screen.getByRole('combobox', { name: 'Group' }), { target: { value: 'mood' } });
    fireEvent.click(addButton);

    await waitFor(() => expect(screen.getByRole('rowheader', { name: 'focused' })).toBeInTheDocument());
    expect(fetchMock).toHaveBeenLastCalledWith('/api/vibes/taxonomy', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ group: 'mood', term: 'focused', label: 'Focused' }),
    }));
  });

  it('does not show term creation controls for the legacy read authority', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        terms: [{ id: 'mood:calm', group: 'mood', term: 'calm' }],
        counts: {},
        capabilities: { manageTerms: false },
      }),
    }));
    render(<TaxonomyDirectory />);
    await screen.findByRole('table');
    expect(screen.queryByRole('button', { name: 'Add New Term' })).not.toBeInTheDocument();
  });

  it('renders and searches by the persisted operator-facing label', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        terms: [{ id: 'visualFamily:high-contrast', group: 'visualFamily', term: 'high-contrast', label: 'High Contrast' }],
        counts: {},
      }),
    }));
    render(<TaxonomyDirectory />);
    expect(await screen.findByRole('rowheader', { name: 'High Contrast' })).toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: 'Search taxonomy terms' }), { target: { value: 'contrast' } });
    expect(screen.getByRole('rowheader', { name: 'High Contrast' })).toBeInTheDocument();
  });

  it('renames a normalized term without changing its slug or ID', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ terms: [{ id: 'mood:focused', group: 'mood', term: 'focused', label: 'Focused' }], counts: {}, capabilities: { manageTerms: true } }) })
      .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({ term: { id: 'mood:focused', group: 'mood', term: 'focused', label: 'Deep Focus' } }) });
    vi.stubGlobal('fetch', fetchMock);
    render(<TaxonomyDirectory />);
    fireEvent.click(await screen.findByRole('button', { name: 'Rename' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Name for focused' }), { target: { value: 'Deep Focus' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByRole('rowheader', { name: 'Deep Focus' })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenLastCalledWith('/api/vibes/taxonomy', expect.objectContaining({
      method: 'PATCH',
      body: JSON.stringify({ group: 'mood', term: 'focused', label: 'Deep Focus' }),
    }));
  });

  it('requires inline confirmation before archiving a term', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ terms: [{ id: 'mood:focused', group: 'mood', term: 'focused', label: 'Focused' }], counts: {}, capabilities: { manageTerms: true } }) })
      .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({ term: { id: 'mood:focused', status: 'archived' } }) });
    vi.stubGlobal('fetch', fetchMock);
    render(<TaxonomyDirectory />);
    fireEvent.click(await screen.findByRole('button', { name: 'Archive' }));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Confirm archive' }));
    await waitFor(() => expect(screen.queryByRole('rowheader', { name: 'Focused' })).not.toBeInTheDocument());
    expect(fetchMock).toHaveBeenLastCalledWith('/api/vibes/taxonomy', expect.objectContaining({
      method: 'DELETE',
      body: JSON.stringify({ group: 'mood', term: 'focused' }),
    }));
  });

  it('restores the same term through the archive undo action', async () => {
    const term = { id: 'mood:focused', group: 'mood', term: 'focused', label: 'Focused' };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ terms: [term], counts: {}, capabilities: { manageTerms: true } }) })
      .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({ term: { ...term, status: 'archived' } }) })
      .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({ term }) });
    vi.stubGlobal('fetch', fetchMock);
    render(<TaxonomyDirectory />);
    fireEvent.click(await screen.findByRole('button', { name: 'Archive' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm archive' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Undo archive' }));
    expect(await screen.findByRole('rowheader', { name: 'Focused' })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenLastCalledWith('/api/vibes/taxonomy', expect.objectContaining({
      method: 'PUT',
      body: JSON.stringify({ group: 'mood', term: 'focused' }),
    }));
  });
});
