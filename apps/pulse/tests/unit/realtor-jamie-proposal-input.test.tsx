import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { JamieProposalCard } from '@/components/realtor/JamieProposalCard';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
describe('Jamie financial drafts', () => {
  it('keeps incomplete deductions editable without treating them as confirmed zero', async () => {
    const fetchMock = vi.fn(async (_url: unknown, _init?: RequestInit) => ({ ok: true, json: async () => ({ ok: true, result: {
      kind: 'financial', missingFields: ['deductions'], editableFields: {}, preview: null, apiPayload: null, confirmation: 'Review required',
    } }) }));
    vi.stubGlobal('fetch', fetchMock);
    render(<JamieProposalCard kind="financial" busy={false} submit={vi.fn(async () => true)} />);
    const deductions = screen.getByLabelText('Actual total deductions (USD); enter 0 only if none');
    fireEvent.change(deductions, { target: { value: '1.' } });
    expect(deductions).toHaveValue('1.');
    fireEvent.click(screen.getByRole('button', { name: 'Prepare preview' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    const payload = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(payload.input.deductions).toBeUndefined();
    expect(payload.input.confirmNoDeductions).toBe(false);
    expect(await screen.findByText('Still needed before saving')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Confirm and save' })).not.toBeInTheDocument();
  });
});
