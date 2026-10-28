import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const navigation = vi.hoisted(() => ({ params: new URLSearchParams() }));
vi.mock('next/navigation', () => ({ useSearchParams: () => navigation.params }));
import { ConsultationRequestForm, PublicConsultationRequest } from '@/components/scheduling/PublicConsultationRequest';
import { consultationRequestContext, consultationRequestReceiptSchema } from '@/lib/scheduling/publicConsultationRequest';

const receipt = () => Response.json({ success: true, data: { accepted: true, id: '11111111-1111-4111-8111-111111111111', funnelId: '22222222-2222-4222-8222-222222222222', agentId: 'agent-one', site: 'agent-one' } });
const fetcher = vi.fn();
beforeEach(() => { vi.stubGlobal('fetch', fetcher); fetcher.mockReset().mockImplementation(async () => receipt()); navigation.params = new URLSearchParams('site=agent-one&appointmentType=seller_consultation'); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.useRealTimers(); });
function fill() {
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Seller One' } });
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'seller@example.test' } });
  fireEvent.click(screen.getByRole('checkbox'));
}
function open() { return render(<ConsultationRequestForm kind="seller_consultation" site="agent-one" />); }

describe('consultation request boundary', () => {
  it.each(['site=', 'site=agent&appointmentType=unknown', 'site=agent&appointmentType=__proto__', 'site=bad/site'])('rejects invalid context: %s', input => {
    expect(consultationRequestContext(new URLSearchParams(input))).toBeNull();
  });
  it('accepts a known consultation kind and does not require a typed date or assumed timezone', () => {
    expect(consultationRequestContext(navigation.params)).toEqual({ site: 'agent-one', kind: 'seller_consultation' });
    expect(consultationRequestContext(new URLSearchParams('site=AGENT-ONE'))).toEqual({ site: 'agent-one', kind: 'buyer_consultation' });
  });
  it('requires a saved identity rather than a success flag or honeypot response', () => {
    expect(consultationRequestReceiptSchema.safeParse({ success: true, data: { accepted: true } }).success).toBe(false);
    expect(consultationRequestReceiptSchema.safeParse({ ok: true, bookingId: 'not-a-receipt' }).success).toBe(false);
  });
});

describe('consultation request UI', () => {
  it('saves a consented inquiry once and never claims a reserved time', async () => {
    const view = open();
    expect(screen.getByRole('button', { name: 'Send Request' })).toBeDisabled();
    fill();
    fireEvent.click(screen.getByRole('button', { name: 'Send Request' }));
    await screen.findByRole('region', { name: 'Saved consultation request' });
    expect(screen.getByRole('status')).toHaveTextContent('A time has not been booked.');
    expect(fetcher).toHaveBeenCalledTimes(1);
    const [url, init] = fetcher.mock.calls[0];
    expect(url).toBe('/api/sites/leads');
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({ site: 'agent-one', consent: true, preferredContact: 'email' });
    expect(body.message).toContain('Contact permission:');
    expect(body).not.toHaveProperty('startTime');
    expect(init.headers['Idempotency-Key']).toMatch(/^consultation:/);
    expect(view.container.querySelector('input[type="date"]')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Send Request' })).not.toBeInTheDocument();
  });
  it('retries an uncertain save with the exact same body and key', async () => {
    fetcher.mockRejectedValueOnce(new Error('connection lost'));
    open(); fill();
    fireEvent.click(screen.getByRole('button', { name: 'Send Request' }));
    await screen.findByRole('button', { name: 'Retry Request' });
    expect(screen.getByLabelText('Name')).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Retry Request' }));
    await screen.findByRole('region', { name: 'Saved consultation request' });
    expect(fetcher.mock.calls[1][1].body).toBe(fetcher.mock.calls[0][1].body);
    expect(fetcher.mock.calls[1][1].headers).toEqual(fetcher.mock.calls[0][1].headers);
  });
  it.each([503, 200])('does not claim a saved request after an unverified %s response', async status => {
    fetcher.mockResolvedValueOnce(Response.json({ success: true, data: { accepted: true } }, { status }));
    open(); fill();
    fireEvent.click(screen.getByRole('button', { name: 'Send Request' }));
    await screen.findByRole('button', { name: 'Retry Request' });
    expect(screen.queryByRole('region', { name: 'Saved consultation request' })).not.toBeInTheDocument();
  });
  it('retains editable details after a rejected request and uses a new key after editing', async () => {
    fetcher.mockResolvedValueOnce(new Response(null, { status: 400 }));
    open(); fill();
    fireEvent.click(screen.getByRole('button', { name: 'Send Request' }));
    await screen.findByRole('alert');
    expect(screen.getByLabelText('Name')).toBeEnabled();
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Seller Two' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send Request' }));
    await screen.findByRole('region', { name: 'Saved consultation request' });
    expect(fetcher.mock.calls[1][1].headers['Idempotency-Key']).not.toBe(fetcher.mock.calls[0][1].headers['Idempotency-Key']);
  });
  it('blocks double submits and aborts pending work on unmount', async () => {
    let resolve!: (response: Response) => void;
    fetcher.mockReturnValueOnce(new Promise(done => { resolve = done; }));
    const view = open(); fill();
    const form = view.container.querySelector('form')!;
    fireEvent.submit(form); fireEvent.submit(form);
    expect(fetcher).toHaveBeenCalledTimes(1);
    const signal = fetcher.mock.calls[0][1].signal as AbortSignal;
    view.unmount();
    expect(signal.aborted).toBe(true);
    await act(async () => { resolve(receipt()); });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
  it('times out a stalled save without discarding its retry identity', async () => {
    vi.useFakeTimers();
    fetcher.mockReturnValueOnce(new Promise(() => {}));
    open(); fill(); fireEvent.click(screen.getByRole('button', { name: 'Send Request' }));
    await act(async () => { await vi.advanceTimersByTimeAsync(20000); });
    expect(fetcher.mock.calls[0][1].signal.aborted).toBe(true);
    expect(screen.getByRole('button', { name: 'Retry Request' })).toBeEnabled();
  });
  it('does not send inquiries for invalid links and aborts the old form on navigation', async () => {
    navigation.params = new URLSearchParams('appointmentType=seller_consultation');
    const view = render(<PublicConsultationRequest />);
    expect(screen.getByRole('alert')).toHaveTextContent('Open the consultation link');
    expect(fetcher).not.toHaveBeenCalled();
    navigation.params = new URLSearchParams('site=agent-one'); view.rerender(<PublicConsultationRequest />);
    fetcher.mockReturnValueOnce(new Promise(() => {}));
    fill(); fireEvent.click(screen.getByRole('button', { name: 'Send Request' }));
    navigation.params = new URLSearchParams('site=agent-two'); view.rerender(<PublicConsultationRequest />);
    expect(fetcher.mock.calls[0][1].signal.aborted).toBe(true);
    expect(screen.getByLabelText('Name')).toHaveValue('');
  });
});
