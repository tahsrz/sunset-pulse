import { describe, expect, it } from 'vitest';
import { cmsSlugForTenantPath } from '@/lib/cms/pages/publicPath';

describe('CMS tenant public path selection', () => {
  it('maps the tenant root to the conventional home page slug', () => {
    expect(cmsSlugForTenantPath([])).toBe('home');
  });

  it('accepts normalized single-segment CMS paths', () => {
    expect(cmsSlugForTenantPath(['About-Us'])).toBe('about-us');
  });

  it('preserves existing property routes and defers nested paths', () => {
    expect(cmsSlugForTenantPath(['properties'])).toBeNull();
    expect(cmsSlugForTenantPath(['properties', 'listing-id'])).toBeNull();
    expect(cmsSlugForTenantPath(['about', 'team'])).toBeNull();
  });

  it('rejects malformed or non-slug path input', () => {
    expect(cmsSlugForTenantPath(['not%2Fa%2Fslug'])).toBeNull();
    expect(cmsSlugForTenantPath(['bad%escape'])).toBeNull();
  });
});
