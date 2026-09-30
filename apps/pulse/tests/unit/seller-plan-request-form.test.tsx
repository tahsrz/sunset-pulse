import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import SellerPlanRequestForm from '@/components/lead-capture/SellerPlanRequestForm';

describe('seller plan request form', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) }));
    window.history.replaceState({}, '', '/seller-plan?utm_source=short-video&utm_campaign=fall-sellers');
  });

  it('keeps marketing opt-in optional and sends bounded attribution after explicit contact consent', async () => {
    render(<SellerPlanRequestForm />);
    fireEvent.change(screen.getByLabelText('Your name'), { target: { value: 'Taylor Seller' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'taylor@example.com' } });
    fireEvent.click(screen.getByLabelText('I agree to be contacted to respond to this seller-plan request.'));
    fireEvent.submit(screen.getByRole('button', { name: 'Request my seller plan' }).closest('form')!);

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Your request is saved'));
    const [, options] = vi.mocked(fetch).mock.calls[0];
    const payload = JSON.parse(String(options?.body));
    expect(payload.requestedContact).toBe(true);
    expect(payload.marketingOptIn).toBe(false);
    expect(payload.campaign).toMatchObject({ source: 'short-video', campaign: 'fall-sellers' });
    expect(payload.agentId).toBeUndefined();
  });

  it('does not display success when saving fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({ success: false, message: 'Try again later.' }) }));
    render(<SellerPlanRequestForm />);
    fireEvent.change(screen.getByLabelText('Your name'), { target: { value: 'Taylor Seller' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'taylor@example.com' } });
    fireEvent.click(screen.getByLabelText('I agree to be contacted to respond to this seller-plan request.'));
    fireEvent.submit(screen.getByRole('button', { name: 'Request my seller plan' }).closest('form')!);
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Try again later.'));
  });
});
