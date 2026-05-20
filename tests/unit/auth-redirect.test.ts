import { describe, expect, it } from 'vitest';
import { buildAuthCallbackUrl, sanitizeAuthNext } from '@/lib/core/auth_redirect';

describe('auth redirect helpers', () => {
  it('builds a local callback URL with a preserved safe next path', () => {
    expect(buildAuthCallbackUrl('http://localhost:3000', '/idx')).toBe(
      'http://localhost:3000/auth/callback?next=%2Fidx'
    );
  });

  it('rejects external or protocol-relative callback destinations', () => {
    expect(sanitizeAuthNext('https://example.com')).toBe('/auth/success');
    expect(sanitizeAuthNext('//example.com')).toBe('/auth/success');
    expect(sanitizeAuthNext('/idx')).toBe('/idx');
  });
});
