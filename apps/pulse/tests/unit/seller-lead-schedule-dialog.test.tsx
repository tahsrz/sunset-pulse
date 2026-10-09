import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SellerLeadScheduleDialog } from '@/components/realtor/SellerLeadScheduleDialog';

function installWrites(writer: ReturnType<typeof vi.fn>) {
  vi.stubGlobal('fetch', vi.fn((url, options) => options?.method === 'POST' ? writer(url, options)
    : Promise.resolve(Response.json({ ok: true, result: null }))));
}
const writeCalls = () => vi.mocked(fetch).mock.calls.filter(([, options]) => options?.method === 'POST');
const readyToSave = () => waitFor(() => expect(screen.getByRole('button', { name: /^Schedule (response|appointment)$/ })).toBeEnabled());

describe('seller lead schedule dialog', () => {
  it('preserves the draft while a time zone is incomplete and saves its normalized zone after correction', async () => {
    const writer = vi.fn().mockResolvedValue(Response.json({ ok: true }));
    installWrites(writer);
    const onSaved = vi.fn();
    const retryRequests = new Map<string, string>();
    render(<SellerLeadScheduleDialog leadId="11111111-1111-4111-8111-111111111111" leadName="Taylor Seller" leadRevision={4}
      timeZone="America/Chicago" actionKey="initial-response:v1" retryRequests={retryRequests} onClose={vi.fn()} onSaved={onSaved} />);
    await readyToSave();
    fireEvent.change(screen.getByLabelText('Time'), { target: { value: '16:45' } });
    fireEvent.click(screen.getByLabelText('Remind me at the scheduled time'));
    const originalDate = (screen.getByLabelText('Date') as HTMLInputElement).value;
    fireEvent.change(screen.getByLabelText('Time zone'), { target: { value: 'America/' } });
    expect(screen.getByRole('alert')).toHaveTextContent('Choose a valid time zone');
    expect(screen.getByLabelText('Time zone')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Date')).not.toHaveAttribute('min');
    expect(screen.getByRole('button', { name: 'Schedule response' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Schedule response' }));
    expect(writer).not.toHaveBeenCalled();
    expect(retryRequests.size).toBe(0);
    fireEvent.change(screen.getByLabelText('Time zone'), { target: { value: '  America/New_York  ' } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Date')).toHaveValue(originalDate);
    expect(screen.getByLabelText('Time')).toHaveValue('16:45');
    expect(screen.getByLabelText('Remind me at the scheduled time')).not.toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Schedule response' }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
    expect(JSON.parse(String(writeCalls()[0][1]?.body)).item.due).toMatchObject({
      anchorDate: originalDate, localTime: '16:45', timeZone: 'America/New_York', reminderOffsetsDays: [],
    });
  });

  it.each(['Date', 'Time', 'Time zone'])('blocks an empty %s until it is corrected', async (label) => {
    const writer = vi.fn().mockResolvedValue(Response.json({ ok: true }));
    installWrites(writer);
    render(<SellerLeadScheduleDialog leadId="11111111-1111-4111-8111-111111111111" leadName="Taylor Seller" leadRevision={4}
      timeZone="America/Chicago" actionKey="initial-response:v1" retryRequests={new Map()} onClose={vi.fn()} onSaved={vi.fn()} />);
    await readyToSave();
    const input = screen.getByLabelText(label) as HTMLInputElement;
    const original = input.value;
    fireEvent.change(input, { target: { value: '' } });
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Choose a valid');
    expect(screen.getByRole('button', { name: 'Schedule response' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Schedule response' }));
    expect(writer).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: original } });
    await readyToSave();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('directs a stale Today shortcut to the owner inbox and blocks another stale save', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ ok: false, error: 'Seller request changed.' }, { status: 409 }));
    installWrites(fetchMock);
    const onConflict = vi.fn();
    render(<SellerLeadScheduleDialog leadId="seller-id" leadName="Taylor Seller" leadRevision={4}
      timeZone="America/Chicago" actionKey="initial-response:v1" retryRequests={new Map()}
      onConflict={onConflict} onClose={vi.fn()} onSaved={vi.fn()} />);
    await readyToSave();
    fireEvent.click(screen.getByRole('button', { name: 'Schedule response' }));
    await screen.findByRole('link', { name: 'Review current seller request' });
    expect(onConflict).toHaveBeenCalledOnce();
    expect(screen.getByRole('link', { name: 'Review current seller request' })).toHaveAttribute('href', '/seller-inbox?leadId=seller-id');
    expect(screen.getByRole('button', { name: 'Schedule response' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Schedule response' }));
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(screen.getByRole('alert')).not.toHaveTextContent('You can retry');
  });

  it('blocks overlapping save events and keeps the pending dialog open on Escape', async () => {
    let resolveSave!: (response: Response) => void;
    const fetchMock = vi.fn(() => new Promise<Response>((resolve) => { resolveSave = resolve; }));
    installWrites(fetchMock);
    const onClose = vi.fn();
    const onSaved = vi.fn();
    render(<SellerLeadScheduleDialog leadId="seller-id" leadName="Taylor Seller" leadRevision={4}
      timeZone="America/Chicago" actionKey="initial-response:v1" retryRequests={new Map()}
      onClose={onClose} onSaved={onSaved} />);
    await readyToSave();
    const saveButton = screen.getByRole('button', { name: 'Schedule response' });
    act(() => {
      saveButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      saveButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    await act(async () => resolveSave(Response.json({ ok: true })));
    expect(onSaved).toHaveBeenCalledOnce();
  });

  it('saves one one-time planner reminder and reuses its operation key after an uncertain failure', async () => {
    installWrites(vi.fn()
      .mockRejectedValueOnce(new Error('Network disconnected'))
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true, result: { itemId: 'planner-item' } }) }));
    const onSaved = vi.fn();
    render(<SellerLeadScheduleDialog
      leadId="11111111-1111-4111-8111-111111111111"
      leadName="Taylor Seller"
      leadRevision={4}
      timeZone="America/Chicago"
      actionKey="initial-response:v1"
      retryRequests={new Map()}
      onClose={vi.fn()}
      onSaved={onSaved}
    />);

    await readyToSave();
    fireEvent.click(screen.getByRole('button', { name: 'Schedule response' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Network disconnected'));
    fireEvent.click(screen.getByRole('button', { name: 'Schedule response' }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());

    const firstBody = JSON.parse(String(writeCalls()[0][1]?.body));
    const secondBody = JSON.parse(String(writeCalls()[1][1]?.body));
    expect(writeCalls().map(([url]) => url)).toEqual(['/api/realtor/planner', '/api/realtor/planner']);
    expect(writeCalls()[0][1]?.method).toBe('POST');
    expect(secondBody.item.requestKey).toBe(firstBody.item.requestKey);
    expect(secondBody.item).toMatchObject({
      kind: 'follow_up', expectedAmountCents: null,
      due: { recurrence: { frequency: 'once' }, timeZone: 'America/Chicago', reminderOffsetsDays: [0] },
      sellerLead: { leadId: '11111111-1111-4111-8111-111111111111', actionKey: 'initial-response:v1', expectedLeadRevision: 4 },
    });
    expect(secondBody.item.notes).not.toContain('contact attempt recorded');
  });

  it('keeps a confirmed consultation appointment at its exact owner-local time', async () => {
    installWrites(vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) }));
    render(<SellerLeadScheduleDialog
      leadId="11111111-1111-4111-8111-111111111111"
      leadName="Taylor Seller"
      leadRevision={6}
      timeZone="America/Chicago"
      actionKey="consultation:22222222-2222-4222-8222-222222222222"
      consultationStartsAt="2026-03-08T08:30:00.000Z"
      retryRequests={new Map()}
      onClose={vi.fn()}
      onSaved={vi.fn()}
    />);

    expect(screen.getByRole('heading', { name: 'Schedule confirmed consultation' })).toBeInTheDocument();
    expect(screen.getByLabelText('Date')).toHaveValue('2026-03-08');
    expect(screen.getByLabelText('Time')).toHaveValue('03:30');
    expect(screen.getByLabelText('Date')).toHaveAttribute('readonly');
    expect(screen.getByLabelText('Time')).toHaveAttribute('readonly');
    await readyToSave();
    fireEvent.click(screen.getByRole('button', { name: 'Schedule appointment' }));

    await waitFor(() => expect(writeCalls()).toHaveLength(1));
    const body = JSON.parse(String(writeCalls()[0][1]?.body));
    expect(body.item).toMatchObject({
      kind: 'appointment',
      due: { anchorDate: '2026-03-08', localTime: '03:30', timeZone: 'America/Chicago', utcOffsetMinutes: -300 },
      sellerLead: { actionKey: 'consultation:22222222-2222-4222-8222-222222222222', expectedLeadRevision: 6 },
    });
  });

  it('preserves a confirmed consultation in the repeated fall-back hour when it uses standard time', async () => {
    installWrites(vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) }));
    render(<SellerLeadScheduleDialog
      leadId="11111111-1111-4111-8111-111111111111"
      leadName="Taylor Seller"
      leadRevision={7}
      timeZone="America/Chicago"
      actionKey="consultation:33333333-3333-4333-8333-333333333333"
      consultationStartsAt="2026-11-01T07:30:00.000Z"
      retryRequests={new Map()}
      onClose={vi.fn()}
      onSaved={vi.fn()}
    />);

    expect(screen.getByLabelText('Date')).toHaveValue('2026-11-01');
    expect(screen.getByLabelText('Time')).toHaveValue('01:30');
    await readyToSave();
    fireEvent.click(screen.getByRole('button', { name: 'Schedule appointment' }));
    await waitFor(() => expect(writeCalls()).toHaveLength(1));
    const body = JSON.parse(String(writeCalls()[0][1]?.body));
    expect(body.item.due).toMatchObject({ anchorDate: '2026-11-01', localTime: '01:30', timeZone: 'America/Chicago', utcOffsetMinutes: -360 });
  });

  it('preserves the earlier occurrence of a repeated consultation time too', async () => {
    installWrites(vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) }));
    render(<SellerLeadScheduleDialog
      leadId="11111111-1111-4111-8111-111111111111" leadName="Taylor Seller" leadRevision={8}
      timeZone="America/Chicago" actionKey="consultation:44444444-4444-4444-8444-444444444444"
      consultationStartsAt="2026-11-01T06:30:00.000Z" retryRequests={new Map()} onClose={vi.fn()} onSaved={vi.fn()}
    />);
    await readyToSave();
    fireEvent.click(screen.getByRole('button', { name: 'Schedule appointment' }));
    await waitFor(() => expect(writeCalls()).toHaveLength(1));
    const body = JSON.parse(String(writeCalls()[0][1]?.body));
    expect(body.item.due.utcOffsetMinutes).toBe(-300);
  });
});
