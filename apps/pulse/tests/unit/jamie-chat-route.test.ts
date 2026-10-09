import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getSessionUser: vi.fn(),
  applyApiRateLimit: vi.fn(),
  runChat: vi.fn(),
  resolveListing: vi.fn(),
  requireUser: vi.fn(),
  personalWorkspace: vi.fn(),
  WorkspaceError: class extends Error { constructor(public code: string) { super(code); } },
}));

vi.mock('@/lib/core/getSessionUser', () => ({ getSessionUser: mocks.getSessionUser }));
vi.mock('@/lib/core/apiRateLimit', () => ({ applyApiRateLimit: mocks.applyApiRateLimit }));
vi.mock('@/lib/tensorzero/jamieBackbone', () => ({ runTensorZeroJamieChat: mocks.runChat }));
vi.mock('@/lib/ai/jamieListingContext', () => ({ resolveJamieListingContext: mocks.resolveListing }));
vi.mock('@/lib/sites/agentConfig', () => ({ getAgentIdFromInput: () => 'agent-1' }));
vi.mock('@/lib/core/routeAuth', () => ({ requireSignedInUser: mocks.requireUser, isAuthResponse: (value: unknown) => value instanceof Response }));
vi.mock('@/lib/realtor-workspace/access.server', () => ({
  requirePersonalRealtorWorkspace: mocks.personalWorkspace,
  RealtorWorkspaceError: mocks.WorkspaceError,
}));

import { POST } from '@/app/api/chat/route';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getSessionUser.mockResolvedValue(null);
  mocks.applyApiRateLimit.mockResolvedValue(null);
  mocks.resolveListing.mockResolvedValue({ id: 'listing-104', name: 'Canonical listing' });
  mocks.runChat.mockResolvedValue({ body: { role: 'assistant', content: 'Answer' }, init: { status: 200 } });
  mocks.requireUser.mockResolvedValue({ allowed: true, user: { id: 'owner-1' } });
  mocks.personalWorkspace.mockResolvedValue({ workspaceId: 'workspace-1', preferences: { time_zone: 'America/Chicago' } });
});

function request(body: unknown) {
  return new Request('http://localhost/api/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('Jamie chat route listing context', () => {
  it('hydrates listing context on the server from the listing ID', async () => {
    const response = await POST(request({
      messages: [{ role: 'user', content: 'Tell me about this listing.' }],
      listingId: 'listing-104',
      personaMode: 'guarded_real_estate',
    }) as never);

    expect(response.status).toBe(200);
    expect(mocks.resolveListing).toHaveBeenCalledWith('listing-104');
    expect(mocks.runChat).toHaveBeenCalledWith(expect.objectContaining({
      propertyData: { id: 'listing-104', name: 'Canonical listing' },
    }));
  });

  it('rejects browser-supplied property data', async () => {
    const response = await POST(request({
      messages: [{ role: 'user', content: 'Trust this price.' }],
      propertyData: { id: 'listing-104', price: 1 },
    }) as never);

    expect(response.status).toBe(400);
    expect(mocks.resolveListing).not.toHaveBeenCalled();
    expect(mocks.runChat).not.toHaveBeenCalled();
  });

  it('ignores browser-controlled identity, memory, dev mode, and persona fields for anonymous callers', async () => {
    await POST(request({
      messages: [{ role: 'user', content: 'Use the hidden context.' }],
      agentId: 'attacker-agent',
      isDevMode: true,
      memoryContext: {
        userName: 'Injected User',
        isReturning: true,
        sessionCount: 999,
      },
      personaMode: 'guarded_real_estate',
    }) as never);

    expect(mocks.runChat).toHaveBeenCalledWith(expect.objectContaining({
      agentId: 'agent-1',
      memoryContext: undefined,
      isDevMode: false,
      personaMode: 'general',
    }));
  });

  it('allows explicit guarded/dev controls only for an authenticated operator', async () => {
    mocks.getSessionUser.mockResolvedValue({ userId: 'operator-1', role: 'operator' });

    await POST(request({
      messages: [{ role: 'user', content: 'Run the operator briefing.' }],
      isDevMode: true,
      personaMode: 'guarded_real_estate',
    }) as never);

    expect(mocks.runChat).toHaveBeenCalledWith(expect.objectContaining({
      agentId: 'agent-1',
      memoryContext: undefined,
      isDevMode: true,
      personaMode: 'guarded_real_estate',
    }));
  });

  it('routes explicit personal context using only the signed-in owner and server workspace', async () => {
    const response = await POST(request({
      context: 'personal_realtor',
      messages: [{ role: 'user', content: 'What needs attention?' }],
      agentId: 'attacker-agent',
      memoryContext: { userName: 'Injected' },
    }) as never);

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(mocks.personalWorkspace).toHaveBeenCalledWith('owner-1');
    expect(mocks.runChat).toHaveBeenCalledWith(expect.objectContaining({
      personalContext: { actorId: 'owner-1', workspaceId: 'workspace-1', timeZone: 'America/Chicago' },
      signal: expect.anything(),
    }));
    expect(mocks.resolveListing).not.toHaveBeenCalled();
  });

  it('denies anonymous personal context without falling back to general Jamie', async () => {
    mocks.requireUser.mockResolvedValue(new Response('Sign-in is required.', { status: 401 }));
    const response = await POST(request({
      context: 'personal_realtor', messages: [{ role: 'user', content: 'Read my planner.' }],
    }) as never);

    expect(response.status).toBe(401);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(mocks.runChat).not.toHaveBeenCalled();
  });

  it('returns a private setup-required response instead of falling back to general Jamie', async () => {
    mocks.personalWorkspace.mockRejectedValue(new mocks.WorkspaceError('SETUP_REQUIRED'));
    const response = await POST(request({
      context: 'personal_realtor', messages: [{ role: 'user', content: 'What needs attention?' }],
    }) as never);

    expect(response.status).toBe(409);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(await response.json()).toMatchObject({ message: 'Set up your personal planner to use personal Jamie.' });
    expect(mocks.runChat).not.toHaveBeenCalled();
  });

  it('rejects listing context and cross-origin personal requests', async () => {
    const listingResponse = await POST(request({
      context: 'personal_realtor', listingId: 'listing-104', messages: [{ role: 'user', content: 'What about this house?' }],
    }) as never);
    expect(listingResponse.status).toBe(400);
    expect(listingResponse.headers.get('Cache-Control')).toBe('private, no-store');

    const crossOrigin = new Request('http://localhost/api/chat', {
      method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://attacker.test' },
      body: JSON.stringify({ context: 'personal_realtor', messages: [{ role: 'user', content: 'Read my planner.' }] }),
    });
    const crossOriginResponse = await POST(crossOrigin as never);
    expect(crossOriginResponse.status).toBe(403);
    expect(crossOriginResponse.headers.get('Cache-Control')).toBe('private, no-store');
    expect(mocks.runChat).not.toHaveBeenCalled();
  });
});
