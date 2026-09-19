import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CommandListingReview } from '@/components/command-center/results/CommandListingReview';

const facts = {
  isListingLike: true,
  confidence: 92,
  extractedFields: ['address', 'price'],
  address: '123 Main Street',
  price: '$450,000',
  beds: '3',
  baths: '2',
  sqft: '1,800',
  propertyType: 'Single family',
  status: 'Active',
  mlsId: 'MLS-1',
  features: ['updated kitchen'],
  hooks: ['walkable location'],
  warnings: [],
  missingFields: [],
};

describe('shared listing review', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('preserves edited facts in the explicit rerun command', () => {
    const onApplyAndRerun = vi.fn();
    render(<CommandListingReview listingFacts={facts} sourceCommand="raw listing" running={false} onApplyAndRerun={onApplyAndRerun} />);
    fireEvent.click(screen.getByRole('button', { name: /Edit facts/ }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Approved Address' }), { target: { value: '456 Oak Avenue' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Approved Remarks' }), { target: { value: 'Verified public remarks' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Approved Features' }), { target: { value: 'covered patio' } });
    fireEvent.click(screen.getByRole('button', { name: /Apply facts and rerun/ }));
    expect(onApplyAndRerun).toHaveBeenCalledWith(expect.stringContaining('Address: 456 Oak Avenue'));
    expect(onApplyAndRerun).toHaveBeenCalledWith(expect.stringContaining('Price: $450,000'));
    expect(onApplyAndRerun).toHaveBeenCalledWith(expect.stringContaining('Public Remarks: Verified public remarks'));
    expect(onApplyAndRerun).toHaveBeenCalledWith(expect.stringContaining('Features: covered patio'));
  });

  it('saves edited copy with optimistic versioning and reveals canonical handoff', async () => {
    const fetcher = vi.fn(async (_url: string, init: RequestInit) => Response.json({ data: { intake: { intakeId: 'intake-1', version: init.method === 'POST' ? 1 : 2, publishStatus: JSON.parse(init.body as string).publishStatus } } }));
    vi.stubGlobal('fetch', fetcher);
    render(<CommandListingReview listingFacts={facts} sourceCommand="immutable source" running={false} onApplyAndRerun={vi.fn()} />);
    fireEvent.change(screen.getByRole('textbox', { name: 'MLS summary draft' }), { target: { value: 'Operator edited copy' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Intake' }));
    await screen.findByText('Saved intake v1 / review');
    expect(fetcher.mock.calls[0][0]).toBe('/api/command-center/listing-intakes');
    expect(JSON.parse(fetcher.mock.calls[0][1].body as string)).toMatchObject({ sourceCommand: 'immutable source', drafts: { mls: 'Operator edited copy' }, publishStatus: 'review' });
    fireEvent.click(screen.getByRole('button', { name: 'Mark Ready' }));
    await screen.findByText('Saved intake v2 / ready');
    expect(fetcher.mock.calls[1][1].method).toBe('PUT');
    expect(JSON.parse(fetcher.mock.calls[1][1].body as string)).toMatchObject({ expectedVersion: 1, publishStatus: 'ready' });
    expect(screen.getByTestId('canonical-listing-handoff')).toBeInTheDocument();
  });

  it('keeps readiness blocked and exposes save conflicts without replacing the draft', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ message: 'Version conflict' }, { status: 409 })));
    render(<CommandListingReview listingFacts={{ ...facts, missingFields: ['price'] }} sourceCommand="source" running={false} onApplyAndRerun={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Mark Ready' })).toBeDisabled();
    fireEvent.change(screen.getByRole('textbox', { name: 'MLS summary draft' }), { target: { value: 'Keep my draft' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Intake' }));
    await waitFor(() => expect(screen.getByText('Version conflict')).toBeInTheDocument());
    expect(screen.getByDisplayValue('Keep my draft')).toBeInTheDocument();
  });
});
