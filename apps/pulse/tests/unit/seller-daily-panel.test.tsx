import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));

import { SellerDailyPanel } from '@/components/realtor/SellerDailyPanel';
import { sellerDailyFixture } from '../fixtures/sellerDailyFixture';

describe('seller daily panel', () => {
  it('opens an overdue action on its due date while retaining its private request link', () => {
    render(<SellerDailyPanel result={{ status: 'available', value: sellerDailyFixture({ overdueActions: [{
      occurrence_id: '11111111-1111-4111-8111-111111111111', lead_id: '22222222-2222-4222-8222-222222222222', name: 'Taylor Seller', effective_date: '2025-12-31', title_snapshot: 'Follow up',
    }] }) }} />);
    expect(screen.getByRole('link', { name: 'Open scheduled action →' })).toHaveAttribute('href', '/planner?date=2025-12-31');
    expect(screen.getByRole('link', { name: /Taylor Seller/ })).toHaveAttribute('href', '/seller-inbox?leadId=22222222-2222-4222-8222-222222222222');
  });
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
  it('opens the response scheduler for an owned unscheduled request and refreshes after save', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url, options) => Response.json({ ok: true, ...(options?.method === 'POST' ? {}
      : url === '/api/realtor/today' ? { result: { seller: { status: 'available', value: sellerDailyFixture() } } } : { result: null }) })));
    render(<SellerDailyPanel result={{ status: 'available', value: sellerDailyFixture({
      status: 'available', timeZone: 'America/Chicago', weekStartDate: '2026-10-05', weekEndDate: '2026-10-11',
      counts: { newRequests: 1, customerReplies: 0, confirmedConsultations: 0, recordedClosings: 0 },
      unscheduledRequests: [{ id: '11111111-1111-4111-8111-111111111111', name: 'Taylor Seller', revision: 3, created_at: '2026-10-06T15:00:00Z', timing: null }],
      overdueActions: [], consultations: [],
    }) }} />);

    fireEvent.click(screen.getAllByRole('button', { name: 'Schedule response' })[0]);
    expect(screen.getByRole('heading', { name: 'Schedule seller response' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Schedule response' })[1]).toBeEnabled());
    fireEvent.click(screen.getAllByRole('button', { name: 'Schedule response' })[1]);
    const writes = vi.mocked(fetch).mock.calls.filter(([, options]) => options?.method === 'POST');
    expect(writes).toHaveLength(1);
    expect(JSON.parse(String(writes[0][1]?.body)).item.sellerLead).toEqual({
      leadId: '11111111-1111-4111-8111-111111111111',
      actionKey: 'initial-response:v1',
      expectedLeadRevision: 3,
    });
    await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
    expect(await screen.findByText('No seller requests need an initial response.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Schedule response' })).not.toBeInTheDocument();
  });

  it('links to the remaining work when the bounded lists have more records', () => {
    render(<SellerDailyPanel result={{ status: 'available', value: sellerDailyFixture({
      unscheduledHasMore: true, overdueHasMore: true, consultationsHasMore: true,
      unscheduledRequests: [], overdueActions: [], consultations: [],
    }) }} />);
    expect(screen.getByRole('link', { name: 'View more seller requests →' })).toHaveAttribute('href', '/seller-inbox');
    expect(screen.getByRole('link', { name: 'View more overdue actions →' })).toHaveAttribute('href', '/planner');
    expect(screen.getByRole('link', { name: 'View more consultations →' })).toHaveAttribute('href', '/seller-inbox');
  });
});
