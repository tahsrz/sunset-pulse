import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({ auth: vi.fn(), isAuthResponse: vi.fn(), rpc: vi.fn(), from: vi.fn(), workspaceAccess: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/core/routeAuth', () => ({ requireSignedInUser: mocks.auth, isAuthResponse: mocks.isAuthResponse }));
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { rpc: mocks.rpc, from: mocks.from } }));
vi.mock('@/lib/platform/access/workspaceAccess.server', () => ({
  requireWorkspaceAccess: mocks.workspaceAccess,
  WorkspaceAccessError: class WorkspaceAccessError extends Error {
    constructor(public readonly code: 'NOT_FOUND' | 'FORBIDDEN' | 'INVALID', message: string) { super(message); }
  },
}));

import { GET, POST } from '@/app/api/seller-video-briefs/route';

const actorId = '11111111-1111-4111-8111-111111111111';
const workspaceId = '22222222-2222-4222-8222-222222222222';
const brief = {
  schemaVersion: 1,
  briefId: '33333333-3333-4333-8333-333333333333',
  revision: 1,
  supersedesBriefId: null,
  backlogLink: { itemId: '44444444-4444-4444-8444-444444444444', expectedRevision: 3 },
  topic: 'A seller photo-day checklist',
  audienceNeed: 'Homeowners want calm steps before listing photos.',
  hook: 'Three small steps can make photo day easier.',
  script: 'Start with the entry, clear everyday items, and open window coverings where appropriate.',
  shotList: ['Show a clear entryway before the checklist.'],
  claimEvidence: [],
  listingPermission: { status: 'not-needed', listingReference: null, evidenceReference: null },
  channels: ['tiktok'],
  ctaOfferKey: 'seller-plan',
  campaignKey: 'seller-photo-prep',
  reviewStatus: 'draft',
  reviewedByUserId: null,
  reviewedAt: null,
  reviewNotes: null,
};

describe('seller video brief persistence route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ allowed: true, user: { id: actorId }, mode: 'user' });
    mocks.isAuthResponse.mockImplementation((value) => value instanceof Response);
    mocks.workspaceAccess.mockResolvedValue({ workspaceId, actorId, role: 'owner' });
  });

  it('saves a private draft through the revision-checked workspace RPC', async () => {
    mocks.rpc.mockResolvedValue({ data: [{ saved_brief: brief, saved_at: '2026-10-05T18:00:00Z', reused: false }], error: null });
    const response = await POST(postRequest({ workspaceId, brief }));

    expect(response.status).toBe(201);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(await response.json()).toMatchObject({ ok: true, brief, reused: false });
    expect(mocks.workspaceAccess).toHaveBeenCalledWith(actorId, workspaceId, 'workflow:run');
    expect(mocks.rpc).toHaveBeenCalledWith('platform_save_seller_video_brief', { p_actor_id: actorId, p_workspace_id: workspaceId, p_brief: brief });
  });

  it('returns the same immutable revision on an idempotent retry', async () => {
    mocks.rpc.mockResolvedValue({ data: [{ saved_brief: brief, saved_at: '2026-10-05T18:00:00Z', reused: true }], error: null });
    const response = await POST(postRequest({ workspaceId, brief }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, reused: true, brief });
  });

  it('returns a conflict when the linked backlog revision is stale', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: '40001', message: 'Linked backlog item revision is stale' } });
    const response = await POST(postRequest({ workspaceId, brief }));
    expect(response.status).toBe(409);
    expect((await response.json()).error).toContain('stale');
  });

  it('does not allow a caller to save an approved artifact through the draft endpoint', async () => {
    const response = await POST(postRequest({ workspaceId, brief: { ...brief, reviewStatus: 'approved', reviewedByUserId: actorId, reviewedAt: '2026-10-05T18:00:00Z' } }));
    expect(response.status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('rejects malformed backlog links before persistence', async () => {
    const response = await POST(postRequest({ workspaceId, brief: { ...brief, backlogLink: { itemId: 'bad', expectedRevision: 3 } } }));
    expect(response.status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('requires workspace membership before reading private drafts', async () => {
    const { WorkspaceAccessError } = await import('@/lib/platform/access/workspaceAccess.server');
    mocks.workspaceAccess.mockRejectedValue(new WorkspaceAccessError('FORBIDDEN', 'forbidden'));
    const response = await GET(new NextRequest(`https://sunsetpulse.app/api/seller-video-briefs?workspaceId=${workspaceId}`));
    expect(response.status).toBe(403);
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it('lists private briefs only after the workspace read boundary succeeds', async () => {
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      match: vi.fn(() => query),
      order: vi.fn(() => query),
      limit: vi.fn(() => Promise.resolve({ data: [{ brief_id: brief.briefId, brief_data: brief }], error: null })),
    };
    mocks.from.mockReturnValue(query);
    const response = await GET(new NextRequest(`https://sunsetpulse.app/api/seller-video-briefs?workspaceId=${workspaceId}`));
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(await response.json()).toMatchObject({ ok: true, briefs: [{ brief_id: brief.briefId }] });
    expect(mocks.workspaceAccess).toHaveBeenCalledWith(actorId, workspaceId, 'artifact:read');
    expect(query.eq).toHaveBeenCalledWith('workspace_id', workspaceId);
  });
});

function postRequest(body: unknown) {
  return new NextRequest('https://sunsetpulse.app/api/seller-video-briefs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
