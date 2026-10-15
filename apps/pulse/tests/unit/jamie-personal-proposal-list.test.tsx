import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { JamiePersonalProposalList } from '@/components/chat/JamiePersonalProposalList';

describe('personal Jamie proposal list', () => {
  it('uses the fixed planner route and reuses its request key after an uncertain save', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new Error('Network disconnected')).mockResolvedValueOnce({
      ok: true, json: async () => ({ ok: true, result: { itemId: 'planner-item' } }),
    }));
    render(<JamiePersonalProposalList proposals={[{
      kind: 'planner_proposal', proposalId: '11111111-1111-4111-8111-111111111111',
      editableFields: { title: 'MLS dues' }, missingFields: [], preview: { timeZone: 'America/Chicago', nextThreeDueDates: ['2026-11-01'] },
      targetRevision: null, intendedApiAction: 'POST /api/realtor/planner',
      apiPayload: { itemId: null, expectedRevision: null, item: { kind: 'bill', title: 'MLS dues' } },
      confirmation: 'Draft only. Nothing has been saved.',
    }]} />);

    expect(fetch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm and save' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Network disconnected'));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm and save' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Saved after your confirmation'));

    const calls = vi.mocked(fetch).mock.calls;
    expect(calls.map(([url]) => url)).toEqual(['/api/realtor/planner', '/api/realtor/planner']);
    const first = JSON.parse(String(calls[0][1]?.body));
    const second = JSON.parse(String(calls[1][1]?.body));
    expect(second.item.requestKey).toBe(first.item.requestKey);
  });

  it('does not offer a save action while proposal facts are missing', () => {
    render(<JamiePersonalProposalList proposals={[{
      kind: 'financial_proposal', proposalId: '22222222-2222-4222-8222-222222222222',
      editableFields: {}, missingFields: ['received date'], preview: null,
      targetRevision: null, intendedApiAction: 'POST /api/realtor/financial-records',
      apiPayload: null, confirmation: 'Draft only.',
    }]} />);
    expect(screen.getByText('received date')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Confirm and save' })).not.toBeInTheDocument();
  });

  it('re-prepares edited values on the Jamie route and saves only after a separate confirmation', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true, result: {
        kind: 'goal_proposal', proposalId: '33333333-3333-4333-8333-333333333333',
        editableFields: { metric: 'closings', target: 12, year: 2026 }, missingFields: [],
        preview: { note: 'Draft review' }, targetRevision: null,
        intendedApiAction: 'POST /api/realtor/goals',
        apiPayload: { id: null, metric: 'closings', year: 2026, target: 12, expectedRevision: null },
        confirmation: 'Draft only.',
      } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true, result: { id: 'goal-id' } }) });
    vi.stubGlobal('fetch', fetchMock);
    render(<JamiePersonalProposalList proposals={[{
      kind: 'goal_proposal', proposalId: '22222222-2222-4222-8222-222222222222',
      editableFields: { metric: 'closings', target: 10, year: 2026 }, missingFields: [],
      preview: { note: 'Draft review' }, targetRevision: null,
      intendedApiAction: 'POST /api/realtor/goals',
      apiPayload: { id: null, metric: 'closings', year: 2026, target: 10, expectedRevision: null },
      confirmation: 'Draft only.',
    }]} />);

    fireEvent.click(screen.getByText('Edit draft fields'));
    fireEvent.change(screen.getByLabelText('Target'), { target: { value: '12' } });
    fireEvent.click(screen.getByRole('button', { name: 'Re-prepare draft' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Updated draft is ready'));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('/api/realtor/jamie/proposals');
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({ kind: 'goal', input: { metric: 'closings', target: 12, year: 2026 } });
    expect(screen.getByRole('button', { name: 'Confirm and save' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Confirm and save' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(fetchMock.mock.calls[1][0]).toBe('/api/realtor/goals');
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body)).target).toBe(12);
  });
});
