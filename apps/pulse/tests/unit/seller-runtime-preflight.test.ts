import { describe, expect, it, vi } from 'vitest';
import { inspectSellerRuntime } from '../../scripts/seller-runtime-preflight.mjs';

const projectRef = 'abcdefghijklmnopqrst';
const secret = 'sb_secret_never_print_this_fixture';
const environment = () => ({
  SUPABASE_URL: `https://${projectRef}.supabase.co`,
  NEXT_PUBLIC_SUPABASE_URL: `https://${projectRef}.supabase.co`,
  SUPABASE_SERVICE_ROLE_KEY: secret,
});
const contract = [{ workflow_key: 'seller_email', min_payload_version: 1, max_payload_version: 1, enabled: true }];
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status });
const passingFetcher = () => vi.fn(async (url: URL) => json(url.pathname.endsWith('/workflow_event_contracts') ? contract : []));

describe('seller runtime preflight', () => {
  it('requires a matching explicit target before any credential-bearing request', async () => {
    const fetchImpl = passingFetcher();
    for (const expectedProjectRef of [undefined, 'bad', 'zyxwvutsrqponmlkjihg']) {
      await expect(inspectSellerRuntime(environment(), { expectedProjectRef, fetchImpl })).rejects.toThrow();
    }
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('rejects differing browser/server targets, unsafe origins and non-service credentials before fetching', async () => {
    const fetchImpl = passingFetcher();
    const publicJwt = `eyJ0eXAiOiJKV1QifQ.${Buffer.from(JSON.stringify({ role: 'anon' })).toString('base64url')}.signature`;
    const variants = [
      { NEXT_PUBLIC_SUPABASE_URL: 'https://zyxwvutsrqponmlkjihg.supabase.co' },
      { SUPABASE_URL: `http://${projectRef}.supabase.co` },
      { SUPABASE_URL: `https://user:private@${projectRef}.supabase.co` },
      { SUPABASE_URL: `https://${projectRef}.supabase.co/rest/v1` },
      { SUPABASE_URL: `https://${projectRef}.supabase.co?token=private` },
      { SUPABASE_SERVICE_ROLE_KEY: '' },
      { SUPABASE_SERVICE_ROLE_KEY: 'sb_publishable_wrong_role' },
      { SUPABASE_SERVICE_ROLE_KEY: publicJwt },
      { NEXT_PUBLIC_MOCK_MODE: 'true' },
    ];
    for (const variant of variants) {
      await expect(inspectSellerRuntime({ ...environment(), ...variant }, { expectedProjectRef: projectRef, fetchImpl })).rejects.toThrow();
    }
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('limits reads to empty table results and the existing event contract, and reports no secret values', async () => {
    const fetchImpl = passingFetcher();
    const result = await inspectSellerRuntime({ ...environment(), RESEND_API_KEY: 'private-provider-key', RESEND_FROM_EMAIL: 'private-owner@example.com' }, { expectedProjectRef: projectRef, fetchImpl });
    expect(result.status).toBe('READ_ONLY_PROBES_PASSED');
    expect(result.checks).toHaveLength(8);
    expect(result.hostedCadence).toBe('NOT_VERIFIED');
    expect(result.ownerAndClientFlow).toBe('NOT_VERIFIED');
    for (const [url, options] of fetchImpl.mock.calls as unknown as [URL, RequestInit][]) {
      expect(options.method).toBe('GET');
      expect(options.redirect).toBe('manual');
      expect(options.body).toBeUndefined();
      expect(url.origin).toBe(environment().SUPABASE_URL);
      expect(url.searchParams.get('limit')).toBe(url.pathname.endsWith('/workflow_event_contracts') ? '2' : '0');
      expect(options.headers).toEqual({ apikey: secret, Accept: 'application/json' });
    }
    for (const value of [secret, 'private-provider-key', 'private-owner@example.com']) expect(JSON.stringify(result)).not.toContain(value);
  });

  it('supports explicitly selected local endpoints and legacy service-role JWT headers', async () => {
    const key = `eyJ0eXAiOiJKV1QifQ.${Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64url')}.signature`;
    const fetchImpl = passingFetcher();
    const result = await inspectSellerRuntime({ SUPABASE_URL: 'http://127.0.0.1:54321', SUPABASE_SERVICE_ROLE_KEY: key }, { expectedProjectRef: 'local', fetchImpl });
    expect(result.status).toBe('READ_ONLY_PROBES_PASSED');
    expect(fetchImpl.mock.calls[0][0].origin).toBe('http://127.0.0.1:54321');
    const request = (fetchImpl.mock.calls[0] as unknown as [URL, RequestInit])[1];
    expect(request.headers).toMatchObject({ Authorization: `Bearer ${key}` });
    expect(JSON.stringify(result)).not.toContain(key);
  });

  it('stops on a quota restriction, preserves only the violation code and avoids probing more tables', async () => {
    const fetchImpl = vi.fn(async () => json({ message: `Service restricted: exceed_storage_size_quota. private message ${secret}`, details: 'private seller body' }, 402));
    const result = await inspectSellerRuntime(environment(), { expectedProjectRef: projectRef, fetchImpl });
    expect(result.status).toBe('QUOTA_RESTRICTED');
    expect(result).toMatchObject({ violations: ['exceed_storage_size_quota'] });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(result)).not.toMatch(/private message|private seller body|never_print/);
  });

  it.each([
    [401, {}, 'CREDENTIAL_OR_PERMISSION_FAILURE'],
    [403, { code: '42501' }, 'CREDENTIAL_OR_PERMISSION_FAILURE'],
    [404, { code: 'PGRST205' }, 'SCHEMA_NOT_READY'],
    [400, { code: '42703' }, 'SCHEMA_NOT_READY'],
    [402, {}, 'SERVICE_RESTRICTED'],
    [503, {}, 'HTTP_FAILURE'],
    [302, {}, 'HTTP_FAILURE'],
  ])('classifies HTTP %s without returning raw provider data', async (status, body, expectedStatus) => {
    const fetchImpl = vi.fn(async () => json({ ...body, private: secret }, status));
    const result = await inspectSellerRuntime(environment(), { expectedProjectRef: projectRef, fetchImpl });
    expect(result.status).toBe(expectedStatus);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(result)).not.toContain(secret);
  });

  it.each([
    [], [{ ...contract[0], enabled: false }], [{ ...contract[0], min_payload_version: 2 }],
    [{ ...contract[0], min_payload_version: 0 }], [{ ...contract[0], max_payload_version: 0 }], [contract[0], contract[0]],
  ].map((rows) => ({ rows })))('does not accept an absent, disabled or incompatible event contract ($rows)', async ({ rows }) => {
    const fetchImpl = vi.fn(async (url: URL) => json(url.pathname.endsWith('/workflow_event_contracts') ? rows : []));
    const result = await inspectSellerRuntime(environment(), { expectedProjectRef: projectRef, fetchImpl });
    expect(result.status).toBe('EMAIL_CONTRACT_NOT_READY');
  });

  it('sanitizes network exceptions and passes a timeout signal to every request', async () => {
    const fetchImpl = vi.fn(async (_url: URL, options: RequestInit) => {
      expect(options.signal).toBeInstanceOf(AbortSignal);
      throw new Error(`Failed request with ${secret}`);
    });
    const result = await inspectSellerRuntime(environment(), { expectedProjectRef: projectRef, fetchImpl });
    expect(result.status).toBe('NETWORK_OR_TIMEOUT_FAILURE');
    expect(JSON.stringify(result)).not.toContain(secret);
  });

  it('rejects malformed, oversized and unexpected row-bearing successful responses without printing data', async () => {
    for (const body of ['not JSON', JSON.stringify([{ private: secret }]), JSON.stringify({ message: 'x'.repeat(20_000) })]) {
      const fetchImpl = vi.fn(async () => new Response(body, { status: 200 }));
      const result = await inspectSellerRuntime(environment(), { expectedProjectRef: projectRef, fetchImpl });
      expect(result.status).toBe('UNEXPECTED_RESPONSE');
      expect(fetchImpl).toHaveBeenCalledTimes(1);
      expect(JSON.stringify(result)).not.toContain(secret);
    }
  });

  it('keeps the timeout active while reading the body, rather than marking a hung response as passed', async () => {
    const fetchImpl = vi.fn(async (_url: URL, options: RequestInit) => new Response(new ReadableStream({
      start(controller) {
        options.signal?.addEventListener('abort', () => controller.error(new DOMException('Aborted', 'AbortError')), { once: true });
      },
    })));
    const result = await inspectSellerRuntime(environment(), { expectedProjectRef: projectRef, fetchImpl, timeoutMs: 10 });
    expect(result.status).toBe('NETWORK_OR_TIMEOUT_FAILURE');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
