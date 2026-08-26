import { describe, expect, it } from 'vitest';
import {
  getFirstPartySiteFromHost,
  getTenantFromHost,
  getTenantRewrite,
} from '@/lib/sites/tenantRouting';

describe('Jamie first-party host routing', () => {
  it('reserves Jamie outside the tenant namespace', () => {
    expect(getFirstPartySiteFromHost('jamie.sunsetpulse.app')).toBe('jamie');
    expect(getFirstPartySiteFromHost('jamie.localhost:3000')).toBe('jamie');
    expect(getTenantFromHost('jamie.sunsetpulse.app')).toBeNull();
    expect(getTenantFromHost('jamie.localhost:3000')).toBeNull();
  });

  it('rewrites the first-party host into the Jamie guide page', () => {
    const rewrite = getTenantRewrite({
      headers: new Headers({ host: 'jamie.sunsetpulse.app' }),
      url: 'https://jamie.sunsetpulse.app/',
    });

    expect(rewrite).toMatchObject({
      tenant: 'jamie',
      hostname: 'jamie.sunsetpulse.app',
      kind: 'first-party',
    });
    expect(rewrite?.url.pathname).toBe('/sites/jamie');
  });

  it('keeps ordinary agent subdomains on the tenant path', () => {
    const rewrite = getTenantRewrite({
      headers: new Headers({ host: 'taz.sunsetpulse.app' }),
      url: 'https://taz.sunsetpulse.app/properties/123',
    });

    expect(rewrite).toMatchObject({ tenant: 'taz', kind: 'tenant' });
    expect(rewrite?.url.pathname).toBe('/sites/taz/properties/123');
  });
});
