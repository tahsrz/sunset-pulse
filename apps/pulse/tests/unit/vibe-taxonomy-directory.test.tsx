import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
    const termForm = addButton.closest('form')!;
    fireEvent.change(within(termForm).getByRole('textbox', { name: 'Name' }), { target: { value: 'Focused' } });
    expect(within(termForm).getByRole('textbox', { name: 'Slug' })).toHaveValue('focused');
    fireEvent.change(within(termForm).getByRole('combobox', { name: 'Group' }), { target: { value: 'mood' } });
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

  it('edits normalized term metadata without changing its slug or ID', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ terms: [{ id: 'mood:focused', group: 'mood', term: 'focused', label: 'Focused' }], counts: {}, capabilities: { manageTerms: true } }) })
      .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({ term: { id: 'mood:focused', group: 'mood', term: 'focused', label: 'Deep Focus' } }) });
    vi.stubGlobal('fetch', fetchMock);
    render(<TaxonomyDirectory />);
    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Name for focused' }), { target: { value: 'Deep Focus' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Description for focused' }), { target: { value: 'For concentrated layouts.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByRole('rowheader', { name: 'Deep Focus' })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenLastCalledWith('/api/vibes/taxonomy', expect.objectContaining({
      method: 'PATCH',
      body: JSON.stringify({ group: 'mood', term: 'focused', label: 'Deep Focus', description: 'For concentrated layouts.' }),
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

  it('filters persisted archived terms and restores them after a later refresh', async () => {
    const archived = { id: 'mood:focused', group: 'mood', term: 'focused', label: 'Focused', status: 'archived' };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ terms: [archived], counts: {}, capabilities: { manageTerms: true } }) })
      .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({ term: { ...archived, status: 'active' } }) });
    vi.stubGlobal('fetch', fetchMock);
    render(<TaxonomyDirectory />);
    fireEvent.change(await screen.findByRole('combobox', { name: 'Filter taxonomy status' }), { target: { value: 'archived' } });
    fireEvent.click(screen.getByRole('button', { name: 'Restore' }));
    await waitFor(() => expect(screen.queryByRole('rowheader', { name: 'Focused' })).not.toBeInTheDocument());
    expect(fetchMock).toHaveBeenLastCalledWith('/api/vibes/taxonomy', expect.objectContaining({ method: 'PUT' }));
  });

  it('creates an empty taxonomy group and selects it for the first term', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ terms: [], groups: [{ slug: 'mood', label: 'Mood', hierarchical: false }], counts: {}, capabilities: { manageTerms: true } }) })
      .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({ group: { slug: 'neighborhood', label: 'Neighborhood', hierarchical: true } }) });
    vi.stubGlobal('fetch', fetchMock);
    render(<TaxonomyDirectory />);
    fireEvent.click(await screen.findByText('Add taxonomy', { selector: 'summary' }));
    const taxonomyForm = screen.getByText('Hierarchical').closest('form')!;
    fireEvent.change(within(taxonomyForm).getByRole('textbox', { name: 'Name' }), { target: { value: 'Neighborhood' } });
    fireEvent.click(within(taxonomyForm).getByRole('checkbox', { name: 'Hierarchical' }));
    fireEvent.submit(taxonomyForm);
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Group' })).toHaveValue('neighborhood'));
    expect(fetchMock).toHaveBeenLastCalledWith('/api/vibes/taxonomy/groups', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ slug: 'neighborhood', label: 'Neighborhood', hierarchical: true }),
    }));
  });

  it('summarizes empty, active, and archived terms for every taxonomy group', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({
      terms: [
        { id: 'mood:calm', group: 'mood', term: 'calm', label: 'Calm', status: 'active' },
        { id: 'mood:loud', group: 'mood', term: 'loud', label: 'Loud', status: 'archived' },
      ],
      groups: [
        { slug: 'mood', label: 'Mood', hierarchical: false },
        { slug: 'neighborhood', label: 'Neighborhood', hierarchical: true },
      ],
      counts: {},
      capabilities: { manageTerms: true },
    }) }));
    render(<TaxonomyDirectory />);
    const neighborhoodRow = (await screen.findByRole('button', { name: 'Neighborhood' })).closest('tr')!;
    expect(within(neighborhoodRow).getByText('Hierarchical')).toBeInTheDocument();
    expect(within(neighborhoodRow).getAllByText('0')).toHaveLength(2);
    const moodRow = screen.getByRole('button', { name: 'Mood' }).closest('tr')!;
    expect(within(moodRow).getByText('Flat')).toBeInTheDocument();
    expect(within(moodRow).getAllByText('1')).toHaveLength(2);
    fireEvent.click(within(neighborhoodRow).getByRole('button', { name: 'Neighborhood' }));
    expect(screen.getByRole('combobox', { name: 'Filter taxonomy group' })).toHaveValue('neighborhood');
  });

  it('edits a taxonomy label while keeping its slug and hierarchy type stable', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ terms: [], groups: [{ slug: 'neighborhood', label: 'Neighborhood', hierarchical: true }], counts: {}, capabilities: { manageTerms: true } }) })
      .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({ group: { slug: 'neighborhood', label: 'Area', hierarchical: true } }) });
    vi.stubGlobal('fetch', fetchMock);
    render(<TaxonomyDirectory />);
    const groupRow = (await screen.findByRole('button', { name: 'Neighborhood' })).closest('tr')!;
    fireEvent.click(within(groupRow).getByRole('button', { name: 'Edit' }));
    fireEvent.change(within(groupRow).getByRole('textbox', { name: 'Name for taxonomy neighborhood' }), { target: { value: 'Area' } });
    fireEvent.click(within(groupRow).getByRole('button', { name: 'Save' }));
    expect(await screen.findByRole('button', { name: 'Area' })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenLastCalledWith('/api/vibes/taxonomy/groups', expect.objectContaining({
      method: 'PATCH',
      body: JSON.stringify({ slug: 'neighborhood', label: 'Area' }),
    }));
  });

  it('archives and restores an empty taxonomy while blocking non-empty groups', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({
        terms: [{ id: 'mood:calm', group: 'mood', term: 'calm', status: 'active' }],
        groups: [
          { slug: 'mood', label: 'Mood', hierarchical: false, status: 'active' },
          { slug: 'neighborhood', label: 'Neighborhood', hierarchical: true, status: 'active' },
        ],
        counts: {}, capabilities: { manageTerms: true },
      }) })
      .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({ group: { slug: 'neighborhood', label: 'Neighborhood', hierarchical: true, status: 'archived' } }) })
      .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({ group: { slug: 'neighborhood', label: 'Neighborhood', hierarchical: true, status: 'active' } }) });
    vi.stubGlobal('fetch', fetchMock);
    render(<TaxonomyDirectory />);
    const moodRow = (await screen.findByRole('button', { name: 'Mood' })).closest('tr')!;
    expect(within(moodRow).getByRole('button', { name: 'Archive' })).toBeDisabled();
    let neighborhoodRow = screen.getByRole('button', { name: 'Neighborhood' }).closest('tr')!;
    fireEvent.click(within(neighborhoodRow).getByRole('button', { name: 'Archive' }));
    fireEvent.click(within(neighborhoodRow).getByRole('button', { name: 'Confirm archive' }));
    await waitFor(() => expect(fetchMock).toHaveBeenLastCalledWith('/api/vibes/taxonomy/groups', expect.objectContaining({ method: 'DELETE' })));
    neighborhoodRow = screen.getByRole('button', { name: 'Neighborhood' }).closest('tr')!;
    fireEvent.click(within(neighborhoodRow).getByRole('button', { name: 'Restore' }));
    await waitFor(() => expect(fetchMock).toHaveBeenLastCalledWith('/api/vibes/taxonomy/groups', expect.objectContaining({ method: 'PUT' })));
  });

  it('offers active parents only for hierarchical taxonomy groups', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({
        terms: [
          { id: 'neighborhood:downtown', group: 'neighborhood', term: 'downtown', label: 'Downtown', status: 'active' },
          { id: 'neighborhood:old-town', group: 'neighborhood', term: 'old-town', label: 'Old Town', status: 'archived' },
        ],
        groups: [{ slug: 'neighborhood', label: 'Neighborhood', hierarchical: true }],
        counts: {},
        capabilities: { manageTerms: true },
      }) })
      .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({ term: { id: 'neighborhood:downtown-east', group: 'neighborhood', term: 'downtown-east', label: 'Downtown East', parentId: 'neighborhood:downtown' } }) });
    vi.stubGlobal('fetch', fetchMock);
    render(<TaxonomyDirectory />);
    const termForm = (await screen.findByRole('button', { name: 'Add New Term' })).closest('form')!;
    fireEvent.change(within(termForm).getByRole('combobox', { name: 'Group' }), { target: { value: 'neighborhood' } });
    const parentSelect = within(termForm).getByRole('combobox', { name: 'Parent term' });
    expect(within(parentSelect).getByRole('option', { name: 'Downtown' })).toBeInTheDocument();
    expect(within(parentSelect).queryByRole('option', { name: 'Old Town' })).not.toBeInTheDocument();
    fireEvent.change(within(termForm).getByRole('textbox', { name: 'Name' }), { target: { value: 'Downtown East' } });
    fireEvent.change(parentSelect, { target: { value: 'downtown' } });
    fireEvent.submit(termForm);
    await waitFor(() => expect(fetchMock).toHaveBeenLastCalledWith('/api/vibes/taxonomy', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ group: 'neighborhood', term: 'downtown-east', label: 'Downtown East', parentTerm: 'downtown' }),
    })));
  });

  it('shows the readable parent relationship in the directory', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({
      terms: [
        { id: 'neighborhood:downtown', group: 'neighborhood', term: 'downtown', label: 'Downtown' },
        { id: 'neighborhood:downtown-east', group: 'neighborhood', term: 'downtown-east', label: 'Downtown East', parentId: 'neighborhood:downtown' },
      ],
      counts: {},
    }) }));
    render(<TaxonomyDirectory />);
    expect(await screen.findByRole('columnheader', { name: 'Parent' })).toBeInTheDocument();
    const childRow = screen.getByRole('rowheader', { name: 'Downtown East' }).closest('tr')!;
    expect(within(childRow).getByText('Downtown')).toBeInTheDocument();
  });

  it('renders and searches operator-facing term descriptions', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({
      terms: [{ id: 'mood:focused', group: 'mood', term: 'focused', label: 'Focused', description: 'For concentrated editorial layouts.' }],
      counts: {},
    }) }));
    render(<TaxonomyDirectory />);
    expect(await screen.findByText('For concentrated editorial layouts.')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: 'Search taxonomy terms' }), { target: { value: 'editorial layouts' } });
    expect(screen.getByRole('rowheader', { name: /Focused/ })).toBeInTheDocument();
  });
});
