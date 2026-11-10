import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import SellerPlanRequestForm from '@/components/lead-capture/SellerPlanRequestForm';
import { sellerPlanLeadSchema } from '@/lib/marketing/leadMagnetContract';

function continueToContactStep() {
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
}

describe('seller plan request form', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) }));
    window.history.replaceState({}, '', '/seller-plan?utm_source=short-video&utm_campaign=fall-sellers');
  });

  it('keeps marketing opt-in optional and sends bounded attribution after explicit contact consent', async () => {
    render(<SellerPlanRequestForm />);
    continueToContactStep();
    fireEvent.change(screen.getByLabelText('Your name'), { target: { value: 'Taylor Seller' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'taylor@example.com' } });
    fireEvent.click(screen.getByLabelText('I agree to be contacted to respond to this request.'));
    fireEvent.submit(screen.getByRole('button', { name: 'Send Request' }).closest('form')!);

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Your request is saved'));
    const [, options] = vi.mocked(fetch).mock.calls[0];
    const payload = JSON.parse(String(options?.body));
    expect(sellerPlanLeadSchema.safeParse(payload).success).toBe(true);
    expect(payload.requestedContact).toBe(true);
    expect(payload.offerVersion).toBe('2');
    expect(payload.requestKind).toBe('seller_plan');
    expect(payload.propertyAddress).toBeUndefined();
    expect(payload.marketingOptIn).toBe(false);
    expect(payload.campaign).toMatchObject({ source: 'short-video', campaign: 'fall-sellers' });
    expect(payload.agentId).toBeUndefined();
  });

  it('lets a seller explicitly ask for a reviewed pricing conversation without collecting the address', async () => {
    render(<SellerPlanRequestForm />);
    fireEvent.click(screen.getByRole('radio', { name: /A pricing review/ }));
    continueToContactStep();
    fireEvent.change(screen.getByLabelText('Your name'), { target: { value: 'Taylor Seller' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'taylor@example.com' } });
    fireEvent.click(screen.getByLabelText('I agree to be contacted to respond to this request.'));
    fireEvent.submit(screen.getByRole('button', { name: 'Send Request' }).closest('form')!);

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Your request is saved'));
    const [, options] = vi.mocked(fetch).mock.calls[0];
    const payload = JSON.parse(String(options?.body));
    expect(payload.requestKind).toBe('pricing_review');
    expect(payload.propertyAddress).toBeUndefined();
  });

  it('does not display success when saving fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({ success: false, message: 'Try again later.' }) }));
    render(<SellerPlanRequestForm />);
    continueToContactStep();
    fireEvent.change(screen.getByLabelText('Your name'), { target: { value: 'Taylor Seller' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'taylor@example.com' } });
    fireEvent.click(screen.getByLabelText('I agree to be contacted to respond to this request.'));
    fireEvent.submit(screen.getByRole('button', { name: 'Send Request' }).closest('form')!);
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Try again later.'));
  });

  it('reuses an uncertain submission key for unchanged details and rotates it after an edit', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: false, json: async () => ({ success: false, message: 'Try again later.' }) })
      .mockResolvedValueOnce({ ok: false, json: async () => ({ success: false, message: 'Still offline.' }) }));
    render(<SellerPlanRequestForm />);
    continueToContactStep();
    fireEvent.change(screen.getByLabelText('Your name'), { target: { value: 'Taylor Seller' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'taylor@example.com' } });
    fireEvent.click(screen.getByLabelText('I agree to be contacted to respond to this request.'));
    const form = screen.getByRole('button', { name: 'Send Request' }).closest('form')!;

    fireEvent.submit(form);
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Try again later.'));
    fireEvent.submit(form);
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Still offline.'));
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'taylor+updated@example.com' } });
    fireEvent.submit(form);
    await waitFor(() => expect(vi.mocked(fetch)).toHaveBeenCalledTimes(3));

    const payloads = vi.mocked(fetch).mock.calls.map(([, options]) => JSON.parse(String(options?.body)));
    expect(payloads[0].submissionId).toBe(payloads[1].submissionId);
    expect(payloads[2].submissionId).not.toBe(payloads[1].submissionId);
    for (const payload of payloads) expect(sellerPlanLeadSchema.safeParse(payload).success).toBe(true);
  });
});
