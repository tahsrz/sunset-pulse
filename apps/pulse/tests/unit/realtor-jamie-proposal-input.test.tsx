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

  it('reuses a confirmed draft request key after an uncertain save', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true, result: {
      kind: 'goal_proposal', missingFields: [], editableFields: { metric: 'net_income', target: 10000000, year: 2026 },
      preview: { note: 'Draft only.' }, targetRevision: null,
      apiPayload: { id: null, metric: 'net_income', year: 2026, target: 10000000, expectedRevision: null },
      confirmation: 'Draft only.',
    } }) }));
    const submit = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    render(<JamieProposalCard kind="goal" busy={false} submit={submit} />);
    fireEvent.click(screen.getByRole('button', { name: 'Prepare preview' }));
    await screen.findByRole('button', { name: 'Confirm and save' });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm and save' }));
    await waitFor(() => expect(submit).toHaveBeenCalledOnce());
    fireEvent.click(screen.getByRole('button', { name: 'Confirm and save' }));
    await waitFor(() => expect(submit).toHaveBeenCalledTimes(2));

    const first = submit.mock.calls[0][2] as { requestKey: string };
    const second = submit.mock.calls[1][2] as { requestKey: string };
    expect(second.requestKey).toBe(first.requestKey);
    expect(submit.mock.calls.map(([url]) => url)).toEqual(['/api/realtor/goals', '/api/realtor/goals']);
  });
});
