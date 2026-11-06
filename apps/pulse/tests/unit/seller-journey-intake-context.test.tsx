import React from 'react';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), requireSignedInUser: vi.fn(), requireWorkspace: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { rpc: mocks.rpc } }));
vi.mock('@/lib/core/routeAuth', () => ({
  requireSignedInUser: mocks.requireSignedInUser,
  isAuthResponse: (value: unknown) => value instanceof Response,
}));
vi.mock('@/lib/realtor-workspace/access.server', async (load) => ({
  ...await load<typeof import('@/lib/realtor-workspace/access.server')>(),
  requirePersonalRealtorWorkspace: mocks.requireWorkspace,
}));

import { GET } from '@/app/api/realtor/seller-service/route';
import { SellerIntakeSummary } from '@/components/realtor/SellerIntakeSummary';
import { serializeSellerJourney } from '@/lib/marketing/guidedJourneyRequest';
import { listOwnedSellerLeads } from '@/lib/realtor-workspace/leadStore.server';
import { readSellerCase } from '@/lib/realtor-workspace/sellerService.server';
import { readSellerJourneyIntake } from '@/lib/sites/sellerJourneyIntakeContext';
import { readSellerLeadContext, canContactSeller } from '@/lib/sites/sellerLeadContext';
import { createValidBothJourneyFixture } from '../fixtures/guidedJourneyFixture';

const owner = '11111111-1111-4111-8111-111111111111';
const otherOwner = '22222222-2222-4222-8222-222222222222';
const leadId = '33333333-3333-4333-8333-333333333333';
const draft = createValidBothJourneyFixture();
draft.facts.stories = { state: 'unknown' };
const request = serializeSellerJourney(draft);
const sellerPlan = {
  offerKey: request.offerKey, offerVersion: request.offerVersion, requestKind: request.requestKind, timing: request.timing,
  requestedContact: { granted: true, capturedAt: '2026-11-05T12:00:00Z' }, marketingOptIn: { granted: false }, journey: request.journey,
};
const row = {
  id: leadId, source: 'seller_plan', metadata: { sellerPlan },
  created_at: '2026-11-05T12:00:00Z', agent_id: 'agent-1', site: 'agent', name: 'Taylor Example', email: 'taylor@example.test', message: 'Seller request.',
};
const sellerCase = {
  case: null, lead: { id: leadId, name: row.name, email: row.email, revision: 1, status: 'new' },
  milestones: [], milestoneRecords: [], contactAllowed: true, events: [], messages: [],
  hasMoreEvents: false, hasMoreMessages: false, bookings: [], timeZone: 'America/Chicago',
};
const caseRequest = () => new NextRequest(`https://sunsetpulse.app/api/realtor/seller-service?leadId=${leadId}&actorId=${owner}`);

describe('private seller intake projection', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.requireSignedInUser.mockResolvedValue({ user: { id: owner } });
    mocks.requireWorkspace.mockResolvedValue({});
    mocks.rpc.mockImplementation(async (name, params) => {
      const owned = params.p_actor_id === owner;
      if (name === 'seller_case_read') return owned ? { data: sellerCase } : { error: { code: 'P0002' } };
      if (name === 'seller_lead_list_owned') return { data: owned ? [row] : [] };
      if (name === 'seller_lead_read_recent_events') return { data: [] };
      throw new Error('Unexpected RPC');
    });
  });

  it('validates v3 and projects only the approved fields', () => {
    expect(readSellerJourneyIntake(row)).toEqual({
      address: request.journey.address, homeFacts: request.journey.homeFacts,
      sellingWindow: request.journey.sellingWindow, sellingPreference: request.journey.sellingPreference,
    });
    for (const plan of [
      { ...sellerPlan, offerVersion: '2' },
      { ...sellerPlan, offerKey: 'other' },
      { ...sellerPlan, journey: { ...request.journey, clientShare: true } },
    ]) expect(readSellerJourneyIntake({ ...row, metadata: { sellerPlan: plan } })).toBeNull();
    expect(readSellerJourneyIntake({ ...row, source: 'agent_site' })).toBeNull();
  });

  it('shows provided and missing home facts, preserving a valid zero', () => {
    render(<SellerIntakeSummary intake={readSellerJourneyIntake(row)!} />);
    expect(screen.getByRole('heading', { name: 'Seller Request Details' })).toBeVisible();
    expect(screen.getByText('100 Example Lane')).toBeVisible();
    expect(screen.getByText('0')).toBeVisible();
    expect(screen.getByText('Not Provided')).toBeVisible();
    expect(screen.getByText('Get Ready to List')).toBeVisible();
    expect(screen.queryByText(/250,000|450,000/)).toBeNull();
  });

  it('adds a no-store owner summary without changing milestones or the separate Jamie read', async () => {
    const response = await GET(caseRequest());
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(await response.json()).toMatchObject({ ok: true, result: { milestones: [], bookings: [], intake: readSellerJourneyIntake(row) } });
    expect(mocks.rpc).toHaveBeenLastCalledWith('seller_lead_list_owned', { p_actor_id: owner, p_limit: 1, p_lead_id: leadId });
    const jamieRead = await readSellerCase(owner, leadId);
    expect(jamieRead).not.toHaveProperty('intake');
    expect(mocks.rpc).toHaveBeenLastCalledWith('seller_case_read', { p_actor_id: owner, p_lead_id: leadId });
  });

  it('rejects another signed-in owner before reading intake, even with a spoofed query actor', async () => {
    mocks.requireSignedInUser.mockResolvedValue({ user: { id: otherOwner } });
    const response = await GET(caseRequest());
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ ok: false, error: 'Planner record not found.' });
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith('seller_case_read', { p_actor_id: otherOwner, p_lead_id: leadId });
  });

  it('withholds intake from the inbox response while preserving consent and timing', async () => {
    const { leads } = await listOwnedSellerLeads(owner, { limit: 10 });
    expect(leads[0].metadata).not.toHaveProperty('sellerPlan.journey');
    const inboxRow = { ...row, metadata: leads[0].metadata as typeof row.metadata };
    expect(readSellerLeadContext(inboxRow)).toEqual(readSellerLeadContext(row));
    expect(canContactSeller(inboxRow)).toBe(true);
    expect(row.metadata.sellerPlan.journey).toEqual(request.journey);
  });
});
