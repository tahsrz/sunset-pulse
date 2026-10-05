import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import CmaReviewPanel from '@/app/admin/agent-leads/CmaReviewPanel';

const leadId = 'c3a0b539-406e-4983-80a2-810f795500a7';

beforeEach(() => vi.stubGlobal('fetch', vi.fn()));
afterEach(() => vi.unstubAllGlobals());

describe('private CMA review panel', () => {
  it('loads only on request and saves human-entered draft evidence privately', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true, actorUserId: '9f4678ce-07e7-4200-a674-c14e14f96435', consentEvidenceRef: 'seller-cma-consent:fixture', reviews: [] }) } as Response)
      .mockResolvedValueOnce({ ok: true, status: 201, json: async () => ({ ok: true, review: { reviewId: '44444444-4444-4444-8444-444444444444', revision: 1, status: 'draft', subject: { regionLabel: 'Synthetic area' }, comparables: [{}], expiresAt: '2026-12-31T12:00:00Z' } }) } as Response);

    render(<CmaReviewPanel leadId={leadId} />);
    expect(fetch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Open review workspace' }));
    await screen.findByText('No private review revisions yet.');
    expect(vi.mocked(fetch).mock.calls[0][1]).toMatchObject({ cache: 'no-store' });

    fireEvent.change(screen.getByLabelText('Area / scope label'), { target: { value: 'Synthetic area' } });
    fireEvent.change(screen.getByLabelText('Sale date'), { target: { value: new Date(Date.now() - 86_400_000).toISOString().slice(0, 10) } });
    fireEvent.change(screen.getByLabelText('Recorded sale price (USD)'), { target: { value: '300000' } });
    fireEvent.change(screen.getByLabelText('Source record reference'), { target: { value: 'synthetic-record-1' } });
    fireEvent.change(screen.getByLabelText('Permission evidence reference'), { target: { value: 'synthetic-evidence-1' } });
    fireEvent.change(screen.getByLabelText('low'), { target: { value: '290000' } });
    fireEvent.change(screen.getByLabelText('target'), { target: { value: '305000' } });
    fireEvent.change(screen.getByLabelText('high'), { target: { value: '320000' } });

    fireEvent.click(screen.getByRole('button', { name: 'Save private draft' }));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    const [url, options] = vi.mocked(fetch).mock.calls[1];
    expect(url).toContain(`/api/admin/agent-leads/${leadId}/cma-reviews`);
    expect(options).toMatchObject({ method: 'POST', cache: 'no-store' });
    const body = JSON.parse(String(options?.body));
    expect(body).toMatchObject({ status: 'draft', subject: { regionLabel: 'Synthetic area' }, suggestedRangeUsd: { low: 290000, target: 305000, high: 320000 }, methodologyNote: null });
    expect(body.comparables[0].source.usagePermission).toBe('unknown');
    expect(await screen.findByText('Draft revision 1 saved privately.')).toBeInTheDocument();
  });
});
