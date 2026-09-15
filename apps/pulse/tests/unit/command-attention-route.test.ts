import { describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
vi.mock('@/lib/core/routeAuth', () => ({ requireOperatorRouteAccess: vi.fn(async () => ({ allowed: true })), isAuthResponse: (value: unknown) => value instanceof Response }));
vi.mock('@/lib/core/publicApiRateLimit', () => ({ applyPublicApiRateLimit: vi.fn(async () => null) }));
import { POST } from '@/app/api/commands/attention/route';
import { requireOperatorRouteAccess } from '@/lib/core/routeAuth';
import { applyPublicApiRateLimit } from '@/lib/core/publicApiRateLimit';

describe('bounded attention route', () => {
  const input = { windowId: 'w', agents: [{ id: 'a', workerId: 'follow-up-writer', label: 'Follow-up', assignment: 'Write follow-ups', assignmentRevision: 1 }], segments: [{ id: 's', sessionId: 's', sequence: 1, text: 'Please write a follow up for the buyer', capturedAt: 1, final: true }] };
  const request = () => new Request('http://localhost/api/commands/attention', { method: 'POST', body: JSON.stringify(input) });
  it('denies unauthorized requests before checking the budget', async () => {
    vi.mocked(requireOperatorRouteAccess).mockResolvedValueOnce(new Response(null, { status: 403 }));
    const before = vi.mocked(applyPublicApiRateLimit).mock.calls.length;
    expect((await POST(request())).status).toBe(403);
    expect(vi.mocked(applyPublicApiRateLimit).mock.calls.length).toBe(before);
  });
  it.each([429, 503])('does not assess when the distributed limiter returns %s', async (status) => {
    vi.mocked(applyPublicApiRateLimit).mockResolvedValueOnce(new Response(null, { status }));
    expect((await POST(request())).status).toBe(status);
  });
  it('rejects malformed and oversized requests without command execution', async () => {
    const invalid = await POST(new Request('http://localhost/api/commands/attention', { method: 'POST', body: '{' }));
    expect(invalid.status).toBe(400);
    const oversized = await POST(new Request('http://localhost/api/commands/attention', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ windowId: 'w', agents: [{ id: 'a', workerId: 'follow-up-writer', label: 'a', assignment: 'x', assignmentRevision: 1 }], segments: [{ id: 's', sessionId: 's', sequence: 1, text: 'x'.repeat(2_001), capturedAt: 1, final: true }] }) }));
    expect(oversized.status).toBe(400);
  });

  it('returns bounded rules-based decisions', async () => {
    const response = await POST(new Request('http://localhost/api/commands/attention', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ windowId: 'w', agents: [{ id: 'a', workerId: 'follow-up-writer', label: 'Follow-up', assignment: 'Write follow-ups', assignmentRevision: 1 }], segments: [{ id: 's', sessionId: 's', sequence: 1, text: 'Please write a follow up for the buyer', capturedAt: 1, final: true }] }) }));
    expect(response.status).toBe(200);
    expect((await response.json()).decisions[0].action).toBe('submit');
  });
});
