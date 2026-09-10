import { describe, expect, it } from 'vitest';
import nextConfig, { securityHeaders } from '../../next.config.mjs';

describe('application security headers', () => {
  it('permits same-site framing only on the isolated CMS preview', async () => {
    const rules = await nextConfig.headers();
    const preview = rules.find((rule) => rule.source === '/cms-preview');
    const headers = Object.fromEntries(preview!.headers.map(({ key, value }) => [key, value]));
    expect(headers['X-Frame-Options']).toBe('SAMEORIGIN');
    expect(headers['Content-Security-Policy']).toContain("frame-ancestors 'self'");
    expect(headers['Cache-Control']).toBe('private, no-store');
  });
  it('enforces a CSP and does not configure wildcard credentialed CORS', () => {
    const headers = Object.fromEntries(securityHeaders.map(({ key, value }) => [key, value]));

    expect(headers['Content-Security-Policy']).toContain("object-src 'none'");
    expect(headers['Content-Security-Policy']).toContain("frame-ancestors 'none'");
    expect(headers['Content-Security-Policy']).not.toContain("'unsafe-eval'");
    expect(headers['Permissions-Policy']).toContain('camera=()');
    expect(headers['Access-Control-Allow-Origin']).toBeUndefined();
    expect(headers['Access-Control-Allow-Credentials']).toBeUndefined();
  });
});
