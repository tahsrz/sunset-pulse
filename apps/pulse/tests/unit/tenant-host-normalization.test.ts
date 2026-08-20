import { describe, expect, it } from 'vitest';
import {
  classifyTenantHostname,
  resolveDeploymentEnvironment,
} from '@/lib/tenancy/environment';
import { normalizeHost } from '@/lib/tenancy/normalizeHost';

function normalized(input: string) {
  const result = normalizeHost(input);
  if (!result.ok) throw new Error(`Expected valid host: ${input}`);
  return result.value.hostname;
}

describe('tenant host normalization', () => {
  it('[HST-001] preserves a lowercase platform hostname', () => {
    expect(normalizeHost('alpha.sunsetpulse.app')).toEqual({
      ok: true,
      value: { hostname: 'alpha.sunsetpulse.app', port: null },
    });
  });

  it('[HST-002] normalizes DNS case', () => {
    expect(normalized('ALPHA.SUNSETPULSE.APP')).toBe('alpha.sunsetpulse.app');
  });

  it('[HST-003] parses a valid HTTPS port deliberately', () => {
    expect(normalizeHost('alpha.sunsetpulse.app:443')).toEqual({
      ok: true,
      value: { hostname: 'alpha.sunsetpulse.app', port: 443 },
    });
  });

  it('[HST-004] accepts a development port without granting an environment', () => {
    expect(normalizeHost('alpha.localhost:3000')).toEqual({
      ok: true,
      value: { hostname: 'alpha.localhost', port: 3000 },
    });
  });

  it('[HST-005] canonicalizes one DNS trailing dot', () => {
    expect(normalized('alpha.sunsetpulse.app.')).toBe('alpha.sunsetpulse.app');
  });

  it('[HST-006] rejects surrounding whitespace', () => {
    expect(normalizeHost(' alpha.sunsetpulse.app')).toMatchObject({
      ok: false,
      error: { code: 'SURROUNDING_WHITESPACE' },
    });
  });

  it.each([
    ['HST-007', 'https://alpha.sunsetpulse.app/path'],
    ['HST-008', 'alpha.sunsetpulse.app/path'],
  ])('[%s] rejects URI syntax in %s', (_id, input) => {
    expect(normalizeHost(input)).toMatchObject({
      ok: false,
      error: { code: 'FORBIDDEN_HOST_CHARACTER' },
    });
  });

  it('[HST-009] rejects comma-separated forwarding chains', () => {
    expect(normalizeHost('alpha.sunsetpulse.app,bravo.sunsetpulse.app')).toMatchObject({
      ok: false,
      error: { code: 'FORWARDED_HOST_CHAIN' },
    });
  });

  it('[HST-010] rejects embedded whitespace and control characters', () => {
    expect(normalizeHost('alpha.\u0000sunsetpulse.app')).toMatchObject({
      ok: false,
      error: { code: 'FORBIDDEN_HOST_CHARACTER' },
    });
  });

  it('[HST-011] does not classify a deceptive suffix as a platform tenant', () => {
    expect(classifyTenantHostname({
      hostname: normalized('alpha.sunsetpulse.app.evil.test'),
      environment: 'production',
    })).toMatchObject({ ok: true, kind: 'custom_domain', tenantSlug: null });
  });

  it('[HST-012] does not collapse a deceptive prefix into another tenant slug', () => {
    expect(classifyTenantHostname({
      hostname: normalized('evilalpha.sunsetpulse.app'),
      environment: 'production',
    })).toMatchObject({ ok: true, kind: 'platform_subdomain', tenantSlug: 'evilalpha' });
  });

  it('[HST-013] rejects wildcard-looking hosts', () => {
    expect(normalizeHost('*.sunsetpulse.app')).toMatchObject({
      ok: false,
      error: { code: 'INVALID_HOSTNAME' },
    });
  });

  it('[HST-014] rejects IPv6 until an explicit contract exists', () => {
    expect(normalizeHost('[::1]:3000')).toMatchObject({
      ok: false,
      error: { code: 'IPV6_UNSUPPORTED' },
    });
  });

  it('[HST-015] returns a typed failure for a missing host', () => {
    expect(normalizeHost(null)).toMatchObject({
      ok: false,
      error: { code: 'MISSING_HOST' },
    });
  });

  it('[HST-016] keeps reserved platform hosts out of tenant resolution', () => {
    expect(classifyTenantHostname({
      hostname: normalized('admin.sunsetpulse.app'),
      environment: 'production',
    })).toMatchObject({ ok: true, kind: 'reserved', tenantCandidate: false });
  });

  it('[HST-017] rejects local tenant hosts outside development', () => {
    expect(classifyTenantHostname({
      hostname: normalized('alpha.localhost'),
      environment: 'production',
    })).toMatchObject({ ok: false, code: 'ENVIRONMENT_MISMATCH' });
  });

  it('[HST-018] keeps environment separate from a production-shaped host', () => {
    expect(classifyTenantHostname({
      hostname: normalized('alpha.sunsetpulse.app'),
      environment: 'development',
    })).toMatchObject({
      ok: true,
      kind: 'platform_subdomain',
      tenantSlug: 'alpha',
    });
  });

  it('[HST-019] treats generic Vercel hosts as global preview hosts', () => {
    expect(classifyTenantHostname({
      hostname: normalized('sunset-pulse-git-feature-tahsrz.vercel.app'),
      environment: 'preview',
    })).toMatchObject({
      ok: true,
      kind: 'preview_global',
      tenantCandidate: false,
      tenantSlug: null,
    });
  });

  it('[HST-020] normalization is idempotent', () => {
    const first = normalizeHost('ALPHA.SUNSETPULSE.APP.:443');
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    expect(normalizeHost(`${first.value.hostname}:${first.value.port}`)).toEqual(first);
  });

  it('keeps single-label and IPv4 infrastructure hosts out of tenant resolution', () => {
    for (const input of ['intranet', '127.0.0.1', '203.0.113.10']) {
      expect(classifyTenantHostname({
        hostname: normalized(input),
        environment: 'development',
      })).toMatchObject({ ok: true, kind: 'reserved', tenantCandidate: false });
    }
  });

  it('fails closed when deployment environment configuration is unknown', () => {
    expect(resolveDeploymentEnvironment({
      vercelEnvironment: 'staging',
      nodeEnvironment: 'production',
    })).toMatchObject({ ok: false });
  });

  it('maps test mode to development without granting production scope', () => {
    expect(resolveDeploymentEnvironment({ nodeEnvironment: 'test' })).toEqual({
      ok: true,
      environment: 'development',
    });
  });
});
