import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SellerOutcomePicker } from '@/components/realtor/SellerOutcomePicker';

const leadId = '11111111-1111-4111-8111-111111111111';
const event = (suffix: number) => ({
  id: `22222222-2222-4222-8222-${String(suffix).padStart(12, '0')}`,
  event_type: 'consultation_confirmed', lead_revision: 4,
  occurred_at: '2026-10-08T15:00:00Z', created_at: '2026-10-07T15:00:00Z', details: {},
});
const response = (events: ReturnType<typeof event>[], nextCursor: string | null = null) => ({
  ok: true, json: async () => ({ ok: true, result: { events, nextCursor } }),
});

describe('seller outcome picker', () => {
  beforeEach(() => { vi.stubGlobal('fetch', vi.fn()); });
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  it('loads older active consultations and returns the selected persisted receipt', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(response([event(2)], 'older') as Response)
      .mockResolvedValueOnce(response([event(1)]) as Response);
    const onAction = vi.fn();
    render(<SellerOutcomePicker leadId={leadId} kind="consultation" timeZone="America/Chicago" disabled={false} onAction={onAction} />);
    await screen.findByRole('button', { name: 'Load older consultations' });
    fireEvent.click(screen.getByRole('button', { name: 'Load older consultations' }));
    await waitFor(() => expect(screen.getByLabelText('Confirmed consultation')).toHaveValue(event(1).id));
    expect(String(vi.mocked(fetch).mock.calls[1][0])).toContain('cursor=older');
    fireEvent.click(screen.getByRole('button', { name: 'Record cancellation' }));
    expect(onAction).toHaveBeenCalledWith(event(1).id, event(1));
    expect(screen.getByRole('button', { name: 'Back to latest consultations' })).toBeInTheDocument();
    expect(vi.mocked(fetch).mock.calls.every(([, options]) => !options?.body)).toBe(true);
  });

  it('shows a retryable read failure without claiming there are no active consultations', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network disconnected'))
      .mockResolvedValueOnce(response([event(1)]) as Response);
    render(<SellerOutcomePicker leadId={leadId} kind="consultation" timeZone="America/Chicago" disabled={false} onAction={vi.fn()} />);
    await screen.findByRole('alert');
    expect(screen.queryByText('No active consultation is recorded.')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Record cancellation' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry consultations' }));
    await screen.findByRole('button', { name: 'Record cancellation' });
  });

  it('aborts and discards a previous lead response when the current lead changes', async () => {
    let resolveOld!: (value: Response) => void;
    vi.mocked(fetch).mockImplementationOnce(() => new Promise<Response>((resolve) => { resolveOld = resolve; }))
      .mockResolvedValueOnce(response([event(2)]) as Response);
    const props = { kind: 'consultation' as const, timeZone: 'America/Chicago', disabled: false, onAction: vi.fn() };
    const { rerender } = render(<SellerOutcomePicker {...props} leadId={leadId} />);
    const oldSignal = vi.mocked(fetch).mock.calls[0][1]?.signal;
    rerender(<SellerOutcomePicker {...props} leadId="33333333-3333-4333-8333-333333333333" />);
    expect(oldSignal?.aborted).toBe(true);
    await waitFor(() => expect(screen.getByLabelText('Confirmed consultation')).toHaveValue(event(2).id));
    resolveOld(response([event(1)]) as Response);
    await waitFor(() => expect(screen.getByLabelText('Confirmed consultation')).toHaveValue(event(2).id));
  });
});
