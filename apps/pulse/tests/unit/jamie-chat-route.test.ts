import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getSessionUser: vi.fn(),
  applyApiRateLimit: vi.fn(),
  runChat: vi.fn(),
  resolveListing: vi.fn(),
}));

vi.mock('@/lib/core/getSessionUser', () => ({ getSessionUser: mocks.getSessionUser }));
vi.mock('@/lib/core/apiRateLimit', () => ({ applyApiRateLimit: mocks.applyApiRateLimit }));
vi.mock('@/lib/tensorzero/jamieBackbone', () => ({ runTensorZeroJamieChat: mocks.runChat }));
vi.mock('@/lib/ai/jamieListingContext', () => ({ resolveJamieListingContext: mocks.resolveListing }));
vi.mock('@/lib/sites/agentConfig', () => ({ getAgentIdFromInput: () => 'agent-1' }));

import { POST } from '@/app/api/chat/route';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getSessionUser.mockResolvedValue(null);
  mocks.applyApiRateLimit.mockResolvedValue(null);
  mocks.resolveListing.mockResolvedValue({ id: 'listing-104', name: 'Canonical listing' });
  mocks.runChat.mockResolvedValue({ body: { role: 'assistant', content: 'Answer' }, init: { status: 200 } });
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
});
