import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const routes = [
  'app/api/properties/featured/route.ts',
  'app/api/properties/hot-list/route.ts',
  'app/api/kepler/listings/route.ts',
  'app/api/properties/route.ts',
  'app/api/properties/search/advanced/route.ts',
];

describe('public tenant header boundary', () => {
  it('does not let public inventory endpoints select a tenant from a browser header', () => {
    for (const route of routes) {
      const source = fs.readFileSync(path.join(process.cwd(), route), 'utf8');
      expect(source).not.toContain('x-sunset-tenant');
      expect(source).not.toContain('getAgentTenantSite');
      if (route.includes('/properties/featured') || route.includes('/properties/hot-list')) {
        expect(source).toContain('authoritative host-derived TenantContext');
      }
      expect(source).toContain('projectPublicListing');
    }
  });
});
