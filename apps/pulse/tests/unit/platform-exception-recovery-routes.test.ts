import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({ auth: vi.fn(), access: vi.fn(), rpc: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/core/routeAuth', () => ({ requireSignedInUser: mocks.auth, isAuthResponse: (value: unknown) => value instanceof Response }));
vi.mock('@/lib/platform/access/workspaceAccess.server', () => ({
  requireWorkspaceAccess: mocks.access,
  WorkspaceAccessError: class WorkspaceAccessError extends Error { constructor(public code: string, message: string) { super(message); } },
}));
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { rpc: mocks.rpc } }));

import { POST as resolve } from '@/app/api/workspaces/[workspaceId]/provider-exceptions/[exceptionId]/resolve/route';
import { POST as review } from '@/app/api/workspaces/[workspaceId]/effect-receipts/[receiptId]/recovery-review/route';
import { POST as retryIntent } from '@/app/api/workspaces/[workspaceId]/effect-receipts/[receiptId]/retry-intents/route';

const actor = '11111111-1111-4111-8111-111111111111';
const workspace = '22222222-2222-4222-8222-222222222222';
const receipt = '33333333-3333-4333-8333-333333333333';
const exception = '44444444-4444-4444-8444-444444444444';
const request = (path: string, body: unknown, origin = 'http://localhost') => new NextRequest(
  `http://localhost/api/workspaces/${workspace}/${path}`,
  { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin }, body: JSON.stringify(body) },
);
const exceptionContext = (exceptionId: string) => ({ params: Promise.resolve({ workspaceId: workspace, exceptionId }) });
const receiptContext = (receiptId: string) => ({ params: Promise.resolve({ workspaceId: workspace, receiptId }) });

describe('provider exception and unknown-effect recovery routes', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.auth.mockResolvedValue({ user: { id: actor }, allowed: true, mode: 'user' });
    mocks.access.mockResolvedValue({ workspaceId: workspace, role: 'owner' });
    mocks.rpc.mockResolvedValue({ data: [{ id: receipt }], error: null });
  });

  it('records an owner/admin resolution without exposing a fence-reset operation', async () => {
    const body = { exceptionType: 'quota_breach', resolutionKey: crypto.randomUUID(), reason: 'investigated' };
    const response = await resolve(request(`provider-exceptions/${exception}/resolve`, body), exceptionContext(exception));
    expect(response.status).toBe(200);
    expect(mocks.access).toHaveBeenCalledWith(actor, workspace, 'workspace:manage_apps');
    expect(mocks.rpc).toHaveBeenCalledWith('platform_resolve_provider_exception', expect.objectContaining({
      p_actor_id: actor, p_workspace_id: workspace, p_exception_id: exception, p_reason: 'investigated',
    }));
    expect(JSON.stringify(mocks.rpc.mock.calls)).not.toMatch(/reset|clear_fence/i);
  });

  it('accepts only hashed evidence and preserves reconciliation identity', async () => {
    const body = { reconciliationKey: crypto.randomUUID(), outcome: 'not_applied', evidenceSource: 'provider_lookup', evidenceReference: 'provider-ticket-42', evidenceHash: 'a'.repeat(64) };
    const response = await review(request(`effect-receipts/${receipt}/recovery-review`, body), receiptContext(receipt));
    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith('platform_record_effect_recovery_review', expect.objectContaining({
      p_receipt_id: receipt, p_reconciliation_key: body.reconciliationKey, p_outcome: 'not_applied',
      p_evidence_reference: body.evidenceReference, p_evidence_hash: body.evidenceHash,
    }));
    mocks.rpc.mockClear();
    const invalid = await review(request(`effect-receipts/${receipt}/recovery-review`, { ...body, evidenceHash: 'private provider response' }), receiptContext(receipt));
    expect(invalid.status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('creates only a distinct retry intent and rejects cross-origin requests', async () => {
    const body = { recoveryReviewId: crypto.randomUUID(), idempotencyKey: crypto.randomUUID(), retryOperationId: crypto.randomUUID() };
    const response = await retryIntent(request(`effect-receipts/${receipt}/retry-intents`, body), receiptContext(receipt));
    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith('platform_create_effect_retry_intent', expect.objectContaining({
      p_receipt_id: receipt, p_idempotency_key: body.idempotencyKey, p_retry_operation_id: body.retryOperationId,
    }));
    mocks.rpc.mockClear();
    const foreign = await retryIntent(request(`effect-receipts/${receipt}/retry-intents`, body, 'https://foreign.example'), receiptContext(receipt));
    expect(foreign.status).toBe(403);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
