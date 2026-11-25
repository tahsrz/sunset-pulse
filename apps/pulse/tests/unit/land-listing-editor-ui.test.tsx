import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import ListingEditor from '@/app/admin/listings/ListingEditor';
import PropertyLandDetails from '@/components/property/PropertyLandDetails';
import { landEditorInput, landFacts } from '../fixtures/landListing';

const fetchMock = vi.fn();
const loadedValues = { ...landEditorInput, display_public: true };
beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({ success: true, data: loadedValues }) });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.clearAllMocks(); });

async function load() {
  render(<ListingEditor />);
  fireEvent.change(screen.getByLabelText('Look up by MLS ID'), { target: { value: landEditorInput.mls_id } });
  fireEvent.click(screen.getByRole('button', { name: 'Load listing' }));
  await screen.findByText('Listing loaded.');
}

describe('land listing review', () => {
  it('reviews without writing, invalidates a changed draft, and saves only the reviewed values', async () => {
    await load();
    fireEvent.click(screen.getByRole('button', { name: /^Review listing$/ }));
    expect(screen.getByRole('region', { name: 'Land and development details' })).toHaveTextContent('4.866 acres');
    expect(screen.getByRole('link', { name: 'City packet' })).toHaveAttribute('href', landFacts.documents[0].url);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    fireEvent.change(screen.getByLabelText('Surveyed acreage (acres)'), { target: { value: '4.8' } });
    expect(screen.queryByRole('button', { name: 'Save reviewed listing' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^Review listing$/ }));
    expect(screen.getByRole('region', { name: 'Land and development details' })).toHaveTextContent('4.8 acres');
    fireEvent.click(screen.getByRole('button', { name: 'Save reviewed listing' }));
    await screen.findByText('Listing saved.');
    const request = fetchMock.mock.calls[1][1];
    expect(request.method).toBe('PUT');
    expect(request.body.get('land_surveyed_acres')).toBe('4.8');
  });

  it('keeps edits after a failed save and blocks invalid documents before review', async () => {
    await load();
    fireEvent.change(screen.getByLabelText('Supporting documents (one per line, up to 8)'), { target: { value: 'Bad | javascript:alert(1)' } });
    fireEvent.click(screen.getByRole('button', { name: /^Review listing$/ }));
    expect(screen.getByRole('alert')).toHaveTextContent('source documents');
    expect(screen.queryByRole('button', { name: 'Save reviewed listing' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Supporting documents (one per line, up to 8)'), { target: { value: landEditorInput.land_documents } });
    fireEvent.click(screen.getByRole('button', { name: /^Review listing$/ }));
    fetchMock.mockResolvedValueOnce({ ok: false, json: async () => ({ message: 'Unable to save the listing.' }) });
    fireEvent.click(screen.getByRole('button', { name: 'Save reviewed listing' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Unable to save'));
    expect(screen.getByLabelText('Surveyed acreage (acres)')).toHaveValue(4.866);
  });

  it('shows no empty land panel and keeps concept and verification language visible', () => {
    const view = render(<PropertyLandDetails details={{ documents: [] }} />);
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
    view.rerender(<PropertyLandDetails details={landFacts} />);
    expect(screen.getByText(/Plat approval has not been verified/)).toBeVisible();
    expect(screen.getByText('5 acres')).toBeVisible();
    expect(screen.getByText('4.866 acres')).toBeVisible();
  });
});
