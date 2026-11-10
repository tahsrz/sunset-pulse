import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { SellerConversationComposer } from '@/components/realtor/SellerConversationComposer';

afterEach(() => cleanup());

function renderComposer(onSave = vi.fn(async () => true)) {
  render(<SellerConversationComposer recipient="seller@example.com" sender="agent@example.com" contactAllowed emailEnabled expectedLeadRevision={7} busy={false} disabled={false} saveBlocked={false} error="" onClearError={vi.fn()} onSave={onSave} />);
  return onSave;
}

describe('seller conversation composer', () => {
  it('shows the frozen recipient and message before queueing the reviewed email', async () => {
    const onSave = renderComposer();
    fireEvent.click(screen.getByRole('button', { name: 'Write an email' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Subject' }), { target: { value: 'A quick update' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Message' }), { target: { value: 'The inspection is booked.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Review exact email' }));

    expect(screen.getByRole('region', { name: 'Email review' })).toHaveTextContent('seller@example.com');
    expect(screen.getByRole('region', { name: 'Email review' })).toHaveTextContent('The inspection is booked.');
    expect(onSave).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('checkbox', { name: 'I reviewed this exact message and recipient.' }));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Queue reviewed email' })); });

    expect(onSave).toHaveBeenCalledWith({ action: 'send_email', reviewed: true, expectedLeadRevision: 7, subject: 'A quick update', body: 'The inspection is booked.' });
  });

  it('records a conversation with its exact offset-aware timestamp', async () => {
    const onSave = renderComposer();
    fireEvent.click(screen.getByRole('button', { name: 'Record a conversation' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Subject' }), { target: { value: 'Re: showing' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Message' }), { target: { value: 'They confirmed Friday.' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Exact date and time, including UTC offset' }), { target: { value: '2026-10-19T09:30:00-05:00' } });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Save conversation' })); });

    expect(onSave).toHaveBeenCalledWith({ action: 'record_message', direction: 'inbound', subject: 'Re: showing', body: 'They confirmed Friday.', occurredAt: '2026-10-19T09:30:00-05:00' });
  });

  it('does not send an email through the generic unsaved-draft save control', async () => {
    const onSave = renderComposer();
    fireEvent.click(screen.getByRole('button', { name: 'Write an email' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Subject' }), { target: { value: 'A quick update' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Message' }), { target: { value: 'The inspection is booked.' } });
    fireEvent.keyDown(document, { key: 'Escape' });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Save changes' })); });

    expect(screen.getByRole('region', { name: 'Email review' })).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });
});
