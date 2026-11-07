import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { getOperatorAccess, getVibeCmsAccess, isLocalHost } from '@/lib/core/operator_access';
import { requireOperatorRouteAccess } from '@/lib/core/routeAuth';

const originalEnv = { ...process.env };
const { sessionUser } = vi.hoisted(() => ({ sessionUser: vi.fn() }));
vi.mock('@/lib/core/getSessionUser', () => ({ getSessionUser: sessionUser }));
beforeEach(() => {
  sessionUser.mockReset().mockResolvedValue(null);
  delete process.env.OPERATOR_EMAIL;
  delete process.env.AUTHORIZED_EMAIL;
  delete process.env.E2E_OPERATOR_ACCESS;
  delete process.env.VIBE_CMS_PUBLIC_WRITE_WIP;
});

afterEach(() => {
  process.env = { ...originalEnv };
});

function setNodeEnv(value: NodeJS.ProcessEnv['NODE_ENV']) {
  (process.env as Record<string, string | undefined>).NODE_ENV = value;
}

describe('operator access host detection', () => {
  it.each([undefined, 'false', 'true', 'TRUE', '1'])('denies anonymous hosted CMS access with WIP=%s', async (flag) => {
    setNodeEnv('production');
    if (flag !== undefined) process.env.VIBE_CMS_PUBLIC_WRITE_WIP = flag;
    await expect(getVibeCmsAccess('sunsetpulse.example.com')).resolves.toMatchObject({ allowed: false, mode: 'denied', user: null });
  });

  it('permits the explicit WIP identity only on development loopback', async () => {
    setNodeEnv('development');process.env.VIBE_CMS_PUBLIC_WRITE_WIP = 'true';
    await expect(getVibeCmsAccess('localhost:3000')).resolves.toMatchObject({ allowed: true, user: { id: 'vibe-cms-wip-local' } });
    await expect(getVibeCmsAccess('sunsetpulse.example.com')).resolves.toMatchObject({ allowed: false });
  });

  it.each(['localhost:3000', '127.0.0.1:3000', '[::1]:3000', '10.0.0.1:3000'])('ignores production E2E/WIP shortcuts for host %s', async (host) => {
    setNodeEnv('production');process.env.E2E_OPERATOR_ACCESS = 'true';process.env.VIBE_CMS_PUBLIC_WRITE_WIP = 'true';
    await expect(getOperatorAccess(host)).resolves.toMatchObject({ allowed: false });
    await expect(getVibeCmsAccess(host)).resolves.toMatchObject({ allowed: false });
  });

  it.each(['admin', 'operator'])('permits a trusted %s profile to use hosted CMS', async (role) => {
    setNodeEnv('production');sessionUser.mockResolvedValue({ userId: 'fixture', role, user: { email: 'owner@example.test', role } });
    await expect(getVibeCmsAccess('sunsetpulse.example.com')).resolves.toMatchObject({ allowed: true, mode: 'authenticated' });
  });

  it.each(['consumer', 'realtor'])('does not give a public %s global CMS authority', async (role) => {
    setNodeEnv('production');sessionUser.mockResolvedValue({ userId: 'fixture', role, user: { email: 'visitor@example.test', role } });
    await expect(getVibeCmsAccess('sunsetpulse.example.com')).resolves.toMatchObject({ allowed: false });
    if (role === 'realtor') await expect(getOperatorAccess('sunsetpulse.example.com')).resolves.toMatchObject({ allowed: true });
  });

  it.each(['OPERATOR_EMAIL', 'AUTHORIZED_EMAIL'])('preserves the existing configured %s authority', async (key) => {
    setNodeEnv('production');process.env[key] = 'OWNER@example.test';
    sessionUser.mockResolvedValue({ userId: 'fixture', role: 'realtor', user: { email: 'owner@example.test', role: 'realtor' } });
    await expect(getVibeCmsAccess('sunsetpulse.example.com')).resolves.toMatchObject({ allowed: true });
  });

  it('does not use forwarded host as CMS or generic operator authority', async () => {
    setNodeEnv('development');process.env.E2E_OPERATOR_ACCESS = 'true';process.env.VIBE_CMS_PUBLIC_WRITE_WIP = 'true';
    for (const path of ['/api/vibes', '/api/admin/mls/status']) {
      const response = await requireOperatorRouteAccess(new NextRequest('https://sunsetpulse.example.com'+path, { headers: { host: 'sunsetpulse.example.com', 'x-forwarded-host': 'localhost:3000' } }));
      expect(response).toBeInstanceOf(Response);expect((response as Response).status).toBe(403);
    }
  });

  it('does not apply the WIP identity outside the CMS namespace', async () => {
    setNodeEnv('production');process.env.VIBE_CMS_PUBLIC_WRITE_WIP = 'true';
    const response = await requireOperatorRouteAccess(new NextRequest('https://sunsetpulse.example.com/api/admin/mls/status'));
    expect((response as Response).status).toBe(403);
  });

  it('allows loopback hosts outside production', () => {
    setNodeEnv('development');

    expect(isLocalHost('localhost:3002')).toBe(true);
    expect(isLocalHost('127.0.0.1:3002')).toBe(true);
    expect(isLocalHost('[::1]:3002')).toBe(true);
    expect(isLocalHost('::1')).toBe(true);
  });

  it('allows private dev server network hosts outside production', () => {
    setNodeEnv('development');

    expect(isLocalHost('10.5.0.2:3002')).toBe(true);
    expect(isLocalHost('192.168.1.20:3002')).toBe(true);
    expect(isLocalHost('172.20.4.2:3002')).toBe(true);
    expect(isLocalHost('172.15.4.2:3002')).toBe(false);
    expect(isLocalHost('172.32.4.2:3002')).toBe(false);
    expect(isLocalHost('169.254.12.5:3002')).toBe(true);
    expect(isLocalHost('0.0.0.0:3002')).toBe(true);
    expect(isLocalHost('studio.local:3002')).toBe(true);
  });

  it('allows private IPv6 dev server hosts outside production', () => {
    setNodeEnv('development');

    expect(isLocalHost('[fc00::1]:3002')).toBe(true);
    expect(isLocalHost('[fd12:3456::1]:3002')).toBe(true);
    expect(isLocalHost('[fe80::1]:3002')).toBe(true);
    expect(isLocalHost('[febf::1]:3002')).toBe(true);
  });

  it('does not allow private-looking non-IP hostnames', () => {
    setNodeEnv('development');

    expect(isLocalHost('fc-example.test:3002')).toBe(false);
    expect(isLocalHost('fdsite.test:3002')).toBe(false);
    expect(isLocalHost('fe80office.test:3002')).toBe(false);
    expect(isLocalHost('10.5.0.999:3002')).toBe(false);
    expect(isLocalHost('192.168.one.20:3002')).toBe(false);
    expect(isLocalHost('[fc00:::not-valid]:3002')).toBe(false);
  });

  it('does not allow public IPv6 hosts without authentication', () => {
    setNodeEnv('development');

    expect(isLocalHost('[2001:4860:4860::8888]:3002')).toBe(false);
    expect(isLocalHost('2606:4700:4700::1111')).toBe(false);
  });

  it('does not allow host-based local access in production', () => {
    setNodeEnv('production');

    expect(isLocalHost('localhost:3002')).toBe(false);
    expect(isLocalHost('127.0.0.1:3002')).toBe(false);
    expect(isLocalHost('[::1]:3002')).toBe(false);
    expect(isLocalHost('::1')).toBe(false);
    expect(isLocalHost('10.5.0.2:3002')).toBe(false);
    expect(isLocalHost('192.168.1.20:3002')).toBe(false);
    expect(isLocalHost('studio.local:3002')).toBe(false);
  });

  it('does not allow public hosts without authentication', () => {
    setNodeEnv('development');

    expect(isLocalHost('sunsetpulse.example.com')).toBe(false);
  });
});
