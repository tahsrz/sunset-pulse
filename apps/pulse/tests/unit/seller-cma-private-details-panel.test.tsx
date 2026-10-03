import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import CmaPrivateDetailsPanel from '@/app/admin/agent-leads/CmaPrivateDetailsPanel';

const leadId = 'c3a0b539-406e-4983-80a2-810f795500a7';

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
  vi.stubGlobal('confirm', vi.fn(() => true));
});

afterEach(() => vi.unstubAllGlobals());

describe('private CMA details panel', () => {
  it('does not request or render private fields until opened, then requires explicit seller permission to save', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true, details: null }) } as Response);
    render(<CmaPrivateDetailsPanel leadId={leadId} />);

    expect(fetch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Open private details' }));
    await screen.findByLabelText('Seller-provided property address');

    fireEvent.change(screen.getByLabelText('Seller-provided property address'), { target: { value: '12 Cedar Street' } });
    const save = screen.getByRole('button', { name: 'Save private address' });
    expect(save).toBeDisabled();
    fireEvent.click(screen.getByLabelText(/I confirmed directly with the seller/));
    expect(save).toBeEnabled();

    vi.mocked(fetch).mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true, details: { leadId, expiresAt: '2026-12-31T12:00:00Z' } }) } as Response);
    fireEvent.click(save);
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    const [, options] = vi.mocked(fetch).mock.calls[1];
    expect(options?.method).toBe('POST');
    expect(JSON.parse(String(options?.body))).toEqual({ propertyAddress: '12 Cedar Street', sellerPermissionConfirmed: true });
    expect(await screen.findByText('12 Cedar Street')).toBeInTheDocument();
  });

  it('lets the owner remove a previously saved address after explicit delete confirmation', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true, details: { propertyAddress: '12 Cedar Street', consentCapturedAt: '2026-10-02T12:00:00Z', expiresAt: '2026-12-31T12:00:00Z' } }) } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true, deleted: true }) } as Response);
    render(<CmaPrivateDetailsPanel leadId={leadId} />);
    fireEvent.click(screen.getByRole('button', { name: 'Open private details' }));
    await screen.findByText('12 Cedar Street');
    fireEvent.click(screen.getByRole('button', { name: 'Delete private address' }));

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    expect(confirm).toHaveBeenCalledWith('Permanently delete the private CMA address for this request?');
    expect(vi.mocked(fetch).mock.calls[1][1]?.method).toBe('DELETE');
    expect(await screen.findByText('Private CMA address deleted.')).toBeInTheDocument();
  });
});
