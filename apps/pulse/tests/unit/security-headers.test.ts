import { describe, expect, it } from 'vitest';
import { securityHeaders } from '../../next.config.mjs';

describe('application security headers', () => {
  it('enforces a CSP and does not configure wildcard credentialed CORS', () => {
    const headers = Object.fromEntries(securityHeaders.map(({ key, value }) => [key, value]));

    expect(headers['Content-Security-Policy']).toContain("object-src 'none'");
    expect(headers['Content-Security-Policy']).toContain("frame-ancestors 'none'");
    expect(headers['Permissions-Policy']).toContain('camera=()');
    expect(headers['Access-Control-Allow-Origin']).toBeUndefined();
    expect(headers['Access-Control-Allow-Credentials']).toBeUndefined();
  });
});
