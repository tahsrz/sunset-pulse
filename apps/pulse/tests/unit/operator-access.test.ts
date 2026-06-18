import { afterEach, describe, expect, it } from 'vitest';
import { isLocalHost } from '@/lib/core/operator_access';

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

function setNodeEnv(value: NodeJS.ProcessEnv['NODE_ENV']) {
  (process.env as Record<string, string | undefined>).NODE_ENV = value;
}

describe('operator access host detection', () => {
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
