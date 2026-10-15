import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BusinessView, PaymentDialog, PlannerView } from '@/components/realtor/RealtorWorkspace';
import { ModalSurface } from '@/components/realtor/ModalSurface';

vi.mock('@/components/realtor/JamieProposalCard', () => ({ JamieProposalCard: () => null }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

const businessProps = (submit: (url: string, method: 'POST' | 'PATCH', data: unknown, success: string) => Promise<boolean>) => ({
  data: { summary: {}, ledger: { entries: [], nextCursor: null } },
  timeZone: 'America/Chicago', year: 2026, setYear: vi.fn(), mode: 'gross' as const,
  setMode: vi.fn(), busy: false, submit, onMoreEntries: vi.fn(async () => {}),
});

describe('realtor workspace interaction feedback', () => {
  it('retains planner completion while removing the seller handoff after current ownership is lost', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => Response.json({ ok: true, result: { properties: [], tasks: [], truncated: false } }));
    vi.stubGlobal('fetch', fetchMock);
    const item = { id: '11111111-1111-4111-8111-111111111111', effective_date: '2025-12-31', effective_time: '09:00:00',
      title_snapshot: 'Owned seller response', kind_snapshot: 'follow_up', status: 'pending', revision: 1,
      expected_amount_cents: null, seller_source_available: true,
      seller_lead: { id: '33333333-3333-4333-8333-333333333333' } };
    const props = { timeZone: 'America/Chicago', busy: false, submit: vi.fn(async () => true), onPayment: vi.fn(),
      onMoreProjections: vi.fn(async () => {}) };
    const view = render(<PlannerView {...props} data={{ items: [item], projected: [] }} />);
    expect(screen.getByRole('link', { name: 'Open seller request' })).toHaveAttribute('href', '/seller-inbox?leadId=33333333-3333-4333-8333-333333333333');
    view.rerender(<PlannerView {...props} data={{ items: [{ ...item, seller_source_available: false, seller_lead: null }], projected: [] }} />);
    expect(screen.queryByRole('link', { name: 'Open seller request' })).not.toBeInTheDocument();
    expect(screen.getByText('Owned seller response')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mark complete' })).toBeEnabled();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(fetchMock.mock.calls.every(([, options]) => options?.method === undefined)).toBe(true);
    expect(props.submit).not.toHaveBeenCalled();
  });

  it('offers both stored and projected cursor pages even when the projection page is empty', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ ok: true, result: { properties: [], tasks: [] } }) })));
    const more = vi.fn(async () => {});
    const projections = vi.fn(async () => {});
    render(<PlannerView data={{ items: [], projected: [], nextCursor: 'stored-page', nextProjectionCursor: 'projected-page' }} timeZone="America/Chicago" busy={false} submit={vi.fn(async () => true)} onPayment={vi.fn()} onMoreProjections={projections} onMoreOccurrences={more} />);
    fireEvent.click(screen.getByRole('button', { name: 'Load more deadlines' }));
    await waitFor(() => expect(more).toHaveBeenCalledWith('stored-page'));
    fireEvent.click(screen.getByRole('button', { name: 'Load more projected dates' }));
    expect(projections).toHaveBeenCalledWith('projected-page');
    vi.unstubAllGlobals();
  });

  it('traps keyboard focus, closes on Escape and restores focus to the opener', () => {
    const onClose = vi.fn();
    function Example() {
      const [open, setOpen] = React.useState(false);
      return <><button type="button" onClick={() => setOpen(true)}>Open editor</button>
        {open ? <ModalSurface labelId="test-dialog-title" onClose={() => { onClose(); setOpen(false); }}>
          <h2 id="test-dialog-title">Edit a deadline</h2><input aria-label="Deadline title" /><button type="button">Save</button>
        </ModalSurface> : null}
      </>;
    }

    render(<Example />);
    const opener = screen.getByRole('button', { name: 'Open editor' });
    opener.focus();
    fireEvent.click(opener);
    const title = screen.getByLabelText('Deadline title');
    const save = screen.getByRole('button', { name: 'Save' });
    expect(title).toHaveFocus();

    fireEvent.keyDown(save, { key: 'Tab' });
    expect(title).toHaveFocus();
    fireEvent.keyDown(title, { key: 'Tab', shiftKey: true });
    expect(save).toHaveFocus();

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
    expect(opener).toHaveFocus();
  });

  it('preserves a financial draft when the server rejects a save', async () => {
    const submit = vi.fn(async () => false);
    render(<BusinessView {...businessProps(submit)} />);

    const amount = screen.getByLabelText('Gross commission (USD)');
    fireEvent.change(amount, { target: { value: '123.45' } });
    fireEvent.click(screen.getByRole('button', { name: 'Record commission' }));

    await waitFor(() => expect(submit).toHaveBeenCalledTimes(1));
    expect(screen.getByLabelText('Gross commission (USD)')).toHaveValue('123.45');
  });

  it('shows malformed money inline instead of opening a browser alert', async () => {
    const submit = vi.fn(async () => true);
    render(<BusinessView {...businessProps(submit)} />);

    fireEvent.change(screen.getByLabelText('Gross commission (USD)'), { target: { value: '1.234' } });
    fireEvent.click(screen.getByRole('button', { name: 'Record commission' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/two decimal places|valid amount/i);
    expect(submit).not.toHaveBeenCalled();
  });

  it('keeps the payment dialog open when a bill-payment save is rejected', async () => {
    const onSave = vi.fn(async () => false);
    render(<PaymentDialog
      occurrence={{ id: 'occurrence-1', effective_date: '2026-09-26', effective_time: null,
        title_snapshot: 'Broker dues', kind_snapshot: 'bill', expected_amount_cents: 15000, status: 'pending', revision: 1 }}
      timeZone="America/Chicago" busy={false} onClose={vi.fn()} onSave={onSave}
    />);

    fireEvent.click(screen.getByRole('button', { name: 'Save payment' }));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith(15000, expect.any(String)));
    expect(screen.getByRole('dialog', { name: 'Record bill payment' })).toBeInTheDocument();
  });

  it('keeps a property-task draft intact while refreshing planner data after a conflict', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const result = url.endsWith('/planner/property-tasks')
        ? { tasks: [{ id: 'task-1', title: 'Confirm roof age', priority: 2, estimateMinutes: 30, taskKind: 'verify_fact', propertyId: 'property-1', propertyLabel: 'Keller listing', stale: false }], truncated: false }
        : url.endsWith('/planner/campaign-tasks') ? { tasks: [], truncated: false }
          : { properties: [{ id: 'property-1', label: 'Keller listing', propertyKind: 'residential', status: 'active' }] };
      return { ok: true, json: async () => ({ ok: true, result }) } as Response;
    });
    vi.stubGlobal('fetch', fetchMock);
    const submit = vi.fn<Parameters<typeof businessProps>[0]>(async () => false);
    const props = { data: { items: [], projected: [] }, timeZone: 'America/Chicago', busy: false,
      submit, onPayment: vi.fn(), onMoreProjections: vi.fn(async () => {}), reloadToken: 0 };
    const view = render(<PlannerView {...props} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Use as planner draft' }));
    fireEvent.change(screen.getByLabelText('First due date'), { target: { value: '2026-10-02' } });
    expect(screen.getByLabelText('What is it called?')).toHaveValue('Confirm roof age');

    view.rerender(<PlannerView {...props} reloadToken={1} />);
    await waitFor(() => expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/planner/property-tasks'))).toHaveLength(2));
    expect(screen.getByLabelText('What is it called?')).toHaveValue('Confirm roof age');
    expect(screen.getByLabelText('First due date')).toHaveValue('2026-10-02');

    fireEvent.click(screen.getByRole('button', { name: 'Save to planner' }));
    await waitFor(() => expect(submit).toHaveBeenCalledTimes(1));
    expect(submit.mock.calls[0][2]).toMatchObject({ item: {
      sourceSprintTaskId: 'task-1', due: { anchorDate: '2026-10-02' },
    } });
  });
});
