import { describe, expect, it } from 'vitest';
import SitePluginActivation from '@/models/SitePluginActivation';
import SiteThemeActivation from '@/models/SiteThemeActivation';

describe('CMS extension activation models', () => {
  it('allows one activation record per plugin and site', () => {
    expect((SitePluginActivation as any).schema.indexes()).toContainEqual([
      { tenantId: 1, siteId: 1, pluginId: 1 },
      expect.objectContaining({ unique: true }),
    ]);
  });

  it('allows exactly one active theme pointer per site', () => {
    expect((SiteThemeActivation as any).schema.indexes()).toContainEqual([
      { tenantId: 1, siteId: 1 },
      expect.objectContaining({ unique: true }),
    ]);
  });
});

