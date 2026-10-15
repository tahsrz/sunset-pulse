import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SellerOutcomeDialog } from '@/components/realtor/SellerOutcomeDialog';

describe('seller outcome dialog', () => {
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  it('preserves a closing draft while externally paused and writes only after the refreshed revision arrives', async () => {
    const fetchMock = vi.fn(async (_url: string, options?: RequestInit) => Response.json({ ok: true, result:
      options?.method === 'POST' ? { eventId: crypto.randomUUID(), leadRevision: 6 } : { events: [], nextCursor: null } }));
    vi.stubGlobal('fetch', fetchMock);
    const onReload = vi.fn();
    const props = { leadId: '11111111-1111-4111-8111-111111111111', leadName: 'Seller Fixture', revision: 4,
      timeZone: 'America/Chicago', onClose: vi.fn(), onSaved: vi.fn(), onConsultationConfirmed: vi.fn(), onReload };
    const view = render(<SellerOutcomeDialog {...props} />);
    fireEvent.change(screen.getByLabelText('Stable transaction reference'), { target: { value: 'file-123' } });
    view.rerender(<SellerOutcomeDialog {...props} disabled />);
    expect(screen.getByRole('button', { name: 'Record closing' })).toBeDisabled();
    const form = screen.getByRole('button', { name: 'Record closing' }).closest('form')!;
    fireEvent.submit(form);
    expect(fetchMock.mock.calls.filter(([, options]) => options?.method === 'POST')).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: 'Reload seller request' }));
    expect(onReload).toHaveBeenCalledOnce();
    view.rerender(<SellerOutcomeDialog {...props} revision={5} />);
    expect(screen.getByLabelText('Stable transaction reference')).toHaveValue('file-123');
    fireEvent.click(screen.getByRole('button', { name: 'Record closing' }));
    await waitFor(() => expect(props.onSaved).toHaveBeenCalledOnce());
    const write = fetchMock.mock.calls.find(([, options]) => options?.method === 'POST');
    expect(JSON.parse(String(write?.[1]?.body))).toMatchObject({ expectedRevision: 5, action: 'record_closing', reference: 'file-123' });
  });

  it('reports a conflict to the owner and prevents overlapping outcome writes', async () => {
    let finish!: (response: Response) => void;
    const fetchMock = vi.fn(async (_url: string, options?: RequestInit) => options?.method === 'POST'
      ? new Promise<Response>((resolve) => { finish = resolve; }) : Response.json({ ok: true, result: { events: [], nextCursor: null } }));
    vi.stubGlobal('fetch', fetchMock);
    const onConflict = vi.fn();
    render(<SellerOutcomeDialog leadId="11111111-1111-4111-8111-111111111111" leadName="Seller Fixture"
      revision={4} timeZone="America/Chicago" onClose={vi.fn()} onSaved={vi.fn()} onConsultationConfirmed={vi.fn()} onConflict={onConflict} />);
    fireEvent.change(screen.getByLabelText('Stable transaction reference'), { target: { value: 'file-123' } });
    const form = screen.getByRole('button', { name: 'Record closing' }).closest('form')!;
    fireEvent.submit(form); fireEvent.submit(form);
    expect(fetchMock.mock.calls.filter(([, options]) => options?.method === 'POST')).toHaveLength(1);
    finish(Response.json({ ok: false, error: 'Request changed.' }, { status: 409 }));
    await screen.findByText('Request changed.');
    expect(onConflict).toHaveBeenCalledOnce();
  });

  it('retries an uncertain cancellation once and uses its committed revision for the next correction', async () => {
    const consultationId = '22222222-2222-4222-8222-222222222222';
    const closingId = '33333333-3333-4333-8333-333333333333';
    let cancellationAttempts = 0;
    let cancelled = false;
    let voided = false;
    const writes: Record<string, unknown>[] = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string, options?: RequestInit) => {
      if (options?.method === 'POST') {
        const body = JSON.parse(String(options.body));
        writes.push(body);
        if (body.action === 'cancel_consultation') {
          cancellationAttempts += 1;
          if (cancellationAttempts === 1) throw new Error('Network disconnected');
          cancelled = true;
        } else { voided = true; }
        return { ok: true, json: async () => ({ ok: true, result: {
          eventId: crypto.randomUUID(), leadRevision: voided ? 6 : 5,
        } }) };
      }
      const closing = url.includes('kind=closing');
      return { ok: true, json: async () => ({ ok: true, result: {
        events: (closing ? voided : cancelled) ? [] : [{
          id: closing ? closingId : consultationId,
          event_type: closing ? 'closing_recorded' : 'consultation_confirmed', lead_revision: 4,
          created_at: '2026-10-07T15:00:00Z', occurred_at: '2026-10-08T15:00:00Z',
          details: closing ? { reference: 'transaction-one', closedOn: '2026-10-07' } : {},
        }], nextCursor: null,
      } }) };
    }));
    const onSaved = vi.fn();
    render(<SellerOutcomeDialog leadId="11111111-1111-4111-8111-111111111111" leadName="Seller Fixture"
      revision={4} timeZone="America/Chicago" onClose={vi.fn()} onSaved={onSaved} onConsultationConfirmed={vi.fn()} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Record cancellation' }));
    await screen.findByText('Network disconnected');
    fireEvent.click(screen.getByRole('button', { name: 'Record cancellation' }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
    expect(writes[1]).toEqual(writes[0]);
    expect(writes[1]).toMatchObject({ action: 'cancel_consultation', consultationEventId: consultationId, expectedRevision: 4 });
    await screen.findByText('No active consultation is recorded.');

    fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'Entered the wrong closing reference' } });
    fireEvent.click(await screen.findByRole('button', { name: 'Void closing record' }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(2));
    expect(writes[2]).toMatchObject({ action: 'void_outcome', outcomeEventId: closingId, expectedRevision: 5,
      reason: 'Entered the wrong closing reference' });
    await screen.findByText('No active closing record to correct.');
  });
});
