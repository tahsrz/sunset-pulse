import { describe, expect, it } from 'vitest';
import { getTenantFromHost, getTenantRewrite } from '@/lib/sites/tenantRouting';

describe('KCD Group subdomain routing', () => {
  it('rewrites kcdgroup.sunsetpulse.app to its branded site route', () => {
    const rewrite = getTenantRewrite({
      headers: new Headers({ host: 'kcdgroup.sunsetpulse.app' }),
      url: 'https://kcdgroup.sunsetpulse.app/',
    });

    expect(getTenantFromHost('kcdgroup.sunsetpulse.app')).toBe('kcdgroup');
    expect(rewrite).toMatchObject({
      tenant: 'kcdgroup',
      hostname: 'kcdgroup.sunsetpulse.app',
      kind: 'tenant',
    });
    expect(rewrite?.url.pathname).toBe('/sites/kcdgroup');
  });
});
