import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireAccess: vi.fn(),
  from: vi.fn(),
  leadMaybeSingle: vi.fn(),
  siteMaybeSingle: vi.fn(),
  consentMaybeSingle: vi.fn(),
  getReviews: vi.fn(),
  latestReviews: vi.fn(),
  insertSingle: vi.fn(),
}));

vi.mock('@/lib/core/routeAuth', () => ({
  requireOperatorRouteAccess: mocks.requireAccess,
  isAuthResponse: (value: unknown) => value instanceof Response,
}));
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: mocks.from } }));

import { GET, POST } from '@/app/api/admin/agent-leads/[leadId]/cma-reviews/route';

const leadId = 'c3a0b539-406e-4983-80a2-810f795500a7';
const ownerId = '9f4678ce-07e7-4200-a674-c14e14f96435';
const priorReviewId = '44444444-4444-4444-8444-444444444444';

const reviewInput = {
  status: 'draft',
  subject: {
    regionLabel: 'Synthetic test area',
    facts: { bedrooms: 3, bathrooms: 2, livingAreaSqFt: 1800, lotAreaSqFt: 7000, yearBuilt: 2000 },
  },
  comparables: [{
    comparableId: '33333333-3333-4333-8333-333333333333',
    soldAt: new Date(Date.now() - 2 * 86_400_000).toISOString().slice(0, 10),
    salePriceUsd: 300000,
    facts: { bedrooms: 3, bathrooms: 2, livingAreaSqFt: 1750, lotAreaSqFt: 7000, yearBuilt: 2001 },
    source: {
      sourceType: 'seller-provided',
      recordReference: 'synthetic-comparable-a',
      retrievedAt: new Date().toISOString(),
      usagePermission: 'unknown',
      permissionEvidenceRef: 'synthetic-fixture-evidence',
    },
    adjustments: [{ category: 'living-area', amountUsd: 5000, rationale: 'Synthetic calculation test adjustment.' }],
    adjustedPriceUsd: 305000,
  }],
  suggestedRangeUsd: { low: 290000, target: 305000, high: 320000 },
  methodologyNote: null,
};

function request(method: string, body?: unknown) {
  return new NextRequest(`https://sunsetpulse.app/api/admin/agent-leads/${leadId}/cma-reviews`, {
    method,
    ...(body === undefined ? {} : { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }),
  });
}

const context = { params: Promise.resolve({ leadId }) };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireAccess.mockResolvedValue({ allowed: true, mode: 'authenticated', user: { id: ownerId, role: 'realtor' } });
  mocks.leadMaybeSingle.mockResolvedValue({ data: { id: leadId, agent_id: 'keller-agent', metadata: { sellerPlan: { requestKind: 'pricing_review' } } }, error: null });
  mocks.siteMaybeSingle.mockResolvedValue({ data: { agent_id: 'keller-agent' }, error: null });
  mocks.consentMaybeSingle.mockResolvedValue({
    data: {
      seller_permission_confirmed: true,
      consent_text_version: 'cma-address-consent.v1',
      consent_captured_at: new Date(Date.now() - 60_000).toISOString(),
      expires_at: new Date(Date.now() + 89 * 86_400_000).toISOString(),
    },
    error: null,
  });
  mocks.getReviews.mockResolvedValue({ data: [], error: null });
  mocks.latestReviews.mockResolvedValue({ data: [], error: null });
  mocks.insertSingle.mockImplementation(async () => ({ data: { review_id: priorReviewId }, error: null }));

  mocks.from.mockImplementation((table: string) => {
    if (table === 'agent_site_leads') return { select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: mocks.leadMaybeSingle }) }) }) };
    if (table === 'site_config') return { select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: mocks.siteMaybeSingle }) }) }) };
    if (table === 'seller_cma_private_details') return { select: () => ({ eq: () => ({ eq: () => ({ eq: () => ({ maybeSingle: mocks.consentMaybeSingle }) }) }) }) };
    if (table === 'seller_cma_private_reviews') return {
      select: vi.fn(() => ({
        eq: () => ({
          eq: () => ({
            eq: () => ({
              gt: () => ({ order: () => mocks.getReviews() }),
              order: () => ({ limit: () => mocks.latestReviews() }),
            }),
          }),
        }),
      })),
      insert: vi.fn(() => ({ select: () => ({ single: mocks.insertSingle }) })),
    };
    throw new Error(`Unexpected table: ${table}`);
  });
});

describe('owner-scoped private CMA review API', () => {
  it('requires authenticated owner-mode access before querying storage', async () => {
    mocks.requireAccess.mockResolvedValueOnce({ allowed: true, mode: 'local', user: null });
    const response = await POST(request('POST', reviewInput), context);
    expect(response.status).toBe(401);
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it('does not reveal a pricing request owned by a different account', async () => {
    mocks.siteMaybeSingle.mockResolvedValueOnce({ data: null, error: null });
    const response = await GET(request('GET'), context);
    expect(response.status).toBe(404);
    expect(mocks.getReviews).not.toHaveBeenCalled();
  });

  it('returns only parsed private revisions with no-store headers', async () => {
    const response = await POST(request('POST', reviewInput), context);
    expect(response.status).toBe(201);
    const body = await response.json();
    const readResponse = await GET(request('GET'), context);
    expect(readResponse.headers.get('cache-control')).toContain('no-store');
    mocks.getReviews.mockResolvedValueOnce({ data: [{ review_data: body.review }], error: null });
    const read = await GET(request('GET'), context);
    expect(read.status).toBe(200);
    expect(await read.json()).toMatchObject({ ok: true, actorUserId: ownerId, reviews: [{ reviewId: body.review.reviewId, revision: 1, status: 'draft' }] });
  });

  it('requires current consent and refuses invalid or missing permission before writing', async () => {
    mocks.consentMaybeSingle.mockResolvedValueOnce({ data: null, error: null });
    const response = await POST(request('POST', reviewInput), context);
    expect(response.status).toBe(409);
    expect(mocks.insertSingle).not.toHaveBeenCalled();
  });

  it('allows unknown-source evidence in a draft and assigns immutable revision metadata on the server', async () => {
    const response = await POST(request('POST', reviewInput), context);
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.review).toMatchObject({
      leadId,
      revision: 1,
      supersedesReviewId: null,
      status: 'draft',
      useRestriction: 'private-review-only',
      review: { reviewerUserId: null, reviewedAt: null, sellerPermissionEvidenceRef: null, methodologyNote: null },
    });
    expect(body.review.reviewId).not.toBe(priorReviewId);
  });

  it('requires authorized source evidence and methodology before a human review is recorded', async () => {
    const response = await POST(request('POST', { ...reviewInput, status: 'reviewed', methodologyNote: 'Human-reviewed synthetic evidence and documented method.' }), context);
    expect(response.status).toBe(400);
    expect(mocks.insertSingle).not.toHaveBeenCalled();
  });

  it('saves a reviewed revision with server-assigned reviewer and consent evidence', async () => {
    const authorized = {
      ...reviewInput,
      status: 'reviewed',
      methodologyNote: 'Human-reviewed synthetic evidence and documented method.',
      comparables: reviewInput.comparables.map((item) => ({
        ...item,
        source: { ...item.source, usagePermission: 'internal-review-authorized' },
      })),
    };
    const response = await POST(request('POST', authorized), context);
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.review.review).toMatchObject({ reviewerUserId: ownerId, methodologyNote: authorized.methodologyNote });
    expect(body.review.review.sellerPermissionEvidenceRef).toContain(`seller-cma-consent:${leadId}:`);
  });

  it('rejects stale revision lineage and reports a conflict without exposing DB errors', async () => {
    mocks.latestReviews.mockResolvedValueOnce({ data: [{ review_id: priorReviewId, revision: 1 }], error: null });
    mocks.insertSingle.mockResolvedValueOnce({ data: null, error: { code: '23514', message: 'internal trigger detail' } });
    const response = await POST(request('POST', reviewInput), context);
    expect(response.status).toBe(409);
    expect(await response.json()).not.toHaveProperty('details');
  });
});
