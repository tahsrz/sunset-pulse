import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RequestBodyError, readBoundedJson } from '@/lib/core/readBoundedJson';
import { LeadSchema } from '@/lib/core/validation';

const mocks = vi.hoisted(() => ({ db: vi.fn(), rateLimit: vi.fn() }));
vi.mock('@/lib/core/database', () => ({ default: mocks.db }));
vi.mock('@/models/Lead', () => ({ default: {} }));
vi.mock('@/lib/core/getSessionUser', () => ({ getSessionUser: vi.fn(async () => null) }));
vi.mock('@/lib/core/apiRateLimit', () => ({ applyApiRateLimit: mocks.rateLimit }));
vi.mock('@/lib/supabase', () => ({ supabase: {} }));
vi.mock('@/lib/intelligence/leadProcessor', () => ({ notifyProcessedLead: vi.fn(), processLeadIntelligence: vi.fn(), syncLeadToSupabase: vi.fn() }));
import { POST } from '@/app/api/leads/route';

const request = (body: string, headers: Record<string, string> = {}) => new Request('https://sunsetpulse.app/api/leads', { method: 'POST', body, headers });
beforeEach(() => { vi.clearAllMocks(); mocks.rateLimit.mockResolvedValue(null); });

describe('bounded public lead input', () => {
  it('checks actual bytes when content length is absent or misleading', async () => {
    const headerCases: Array<Record<string, string>> = [{}, { 'content-length': '1' }];
    for (const headers of headerCases) {
      await expect(readBoundedJson(request(JSON.stringify({ text: 'é'.repeat(20) }), headers), 30)).rejects.toMatchObject({ status: 413 });
    }
  });

  it('counts split multibyte chunks correctly and cancels an oversized stream', async () => {
    const encoded = new TextEncoder().encode(JSON.stringify({ text: 'é' }));
    const body = new ReadableStream<Uint8Array>({
      start(controller) { for (const byte of encoded) controller.enqueue(new Uint8Array([byte])); controller.close(); },
    });
    const init: RequestInit & { duplex: 'half' } = { method: 'POST', body, duplex: 'half' };
    expect(await readBoundedJson(new Request('https://sunsetpulse.app', init), encoded.length)).toEqual({ text: 'é' });
    const cancel = vi.fn();
    const large = new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(new Uint8Array(50)); }, cancel });
    await expect(readBoundedJson(new Request('https://sunsetpulse.app', { ...init, body: large }), 10)).rejects.toBeInstanceOf(RequestBodyError);
    expect(cancel).toHaveBeenCalledOnce();
  });

  it('rejects malformed JSON without returning request content', async () => {
    await expect(readBoundedJson(request('private-invalid-json'), 100)).rejects.toMatchObject({ status: 400, message: 'Invalid JSON request.' });
  });

  it('bounds lead tags and leaves absent consent fields absent', () => {
    const input = { name: 'Example', email: 'example@example.com', property: 'property' };
    expect(LeadSchema.safeParse({ ...input, tags: Array(101).fill('tag') }).success).toBe(false);
    expect(LeadSchema.safeParse({ ...input, tags: ['x'.repeat(121)] }).success).toBe(false);
    expect(LeadSchema.parse(input)).not.toHaveProperty('marketingConsent');
  });

  it('returns 413 before opening the database for oversized public submissions', async () => {
    const response = await POST(request(JSON.stringify({ tags: Array(70000).fill('x') })));
    expect(response.status).toBe(413);
    expect(mocks.db).not.toHaveBeenCalled();
  });

  it('returns 400 before opening the database for malformed public submissions', async () => {
    const response = await POST(request('{'));
    expect(response.status).toBe(400);
    expect(mocks.db).not.toHaveBeenCalled();
  });
});
