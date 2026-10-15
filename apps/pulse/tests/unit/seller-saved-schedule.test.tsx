import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SellerLeadScheduleDialog } from '@/components/realtor/SellerLeadScheduleDialog';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const leadId = '11111111-1111-4111-8111-111111111111';
const eventId = '22222222-2222-4222-8222-222222222222';
const saved = { itemId: eventId, title: 'Saved seller follow-up', itemStatus: 'active', effectiveDate: '2025-12-31', occurrenceStatus: 'completed' };
const props = { leadId, leadName: 'Taylor Seller', leadRevision: 3, timeZone: 'America/Chicago',
  retryRequests: new Map<string, string>(), onClose: vi.fn(), onSaved: vi.fn() };

describe('opening an existing seller planner action', () => {
  it.each(['initial-response:v1', `reply:${eventId}`, `consultation:${eventId}`] as const)('opens the saved date for %s without a new write', async (actionKey) => {
    let finishLookup!: (response: Response) => void;
    const fetchMock = vi.fn<typeof fetch>(() => new Promise<Response>((resolve) => { finishLookup = resolve; }));
    vi.stubGlobal('fetch', fetchMock);
    render(<SellerLeadScheduleDialog {...props} actionKey={actionKey} consultationStartsAt={actionKey.startsWith('consultation:') ? '2026-11-01T07:30:00Z' : undefined} />);
    expect(screen.getByRole('button', { name: /^Schedule (response|appointment)$/ })).toBeDisabled();
    await act(async () => finishLookup(Response.json({ ok: true, result: saved })));
    expect(screen.getByRole('link', { name: 'Open saved planner task' })).toHaveAttribute('href', '/planner?date=2025-12-31');
    expect(screen.getByText(/completed · 2025-12-31/)).toBeVisible();
    expect(screen.queryByRole('button', { name: /^Schedule (response|appointment)$/ })).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(String(fetchMock.mock.calls[0][0])).toContain(`actionKey=${encodeURIComponent(actionKey)}`);
  });

  it.each([Response.json({ ok: false }, { status: 503 }), Response.json({ ok: true, result: { effectiveDate: 'bad' } })])('blocks a new save after a failed or malformed lookup and preserves edits during retry', async (failure) => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(failure).mockResolvedValueOnce(Response.json({ ok: true, result: null }));
    vi.stubGlobal('fetch', fetchMock);
    render(<SellerLeadScheduleDialog {...props} actionKey="initial-response:v1" />);
    fireEvent.change(screen.getByLabelText('Time'), { target: { value: '16:45' } });
    await screen.findByRole('button', { name: 'Retry schedule lookup' });
    expect(screen.getByRole('button', { name: 'Schedule response' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Retry schedule lookup' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Schedule response' })).toBeEnabled());
    expect(screen.getByLabelText('Time')).toHaveValue('16:45');
    expect(fetchMock.mock.calls.every(([, options]) => options?.method !== 'POST')).toBe(true);
  });
});
