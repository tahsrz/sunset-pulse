import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
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
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        terms: [{ id: 'mood:calm', group: 'mood', term: 'calm' }],
        counts: {},
        capabilities: { manageTerms: true },
      }),
    }));
    render(<TaxonomyDirectory />);
    expect(await screen.findByRole('button', { name: 'Add New Term' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Name' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Slug' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Group' })).toBeInTheDocument();
  });
});
