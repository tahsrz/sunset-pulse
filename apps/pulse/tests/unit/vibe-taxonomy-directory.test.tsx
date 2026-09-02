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
});
