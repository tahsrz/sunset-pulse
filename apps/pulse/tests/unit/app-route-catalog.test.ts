import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { appRoutes, searchAppRoutes } from '@/lib/navigation/routeCatalog';

function routeFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name);
    return entry.isDirectory() ? routeFiles(file) : /^(page|route)\.[jt]sx?$/.test(entry.name) ? [file] : [];
  });
}

describe('application route catalog', () => {
  it('accounts for every page and non-API handler without making parallel slots into URLs', () => {
    const root = path.resolve('app');
    const actual = new Set(routeFiles(root).map((file) => path.relative(root, file).split(path.sep))
      .filter((parts) => parts[0] !== 'api')
      .map((parts) => '/' + parts.slice(0, -1)
        .filter((part) => !part.startsWith('@') && !/^\([^)]*\)$/.test(part))
        .map((part) => part.replace(/^\(\.\)/, '')).join('/')));
    expect(appRoutes.map((route) => route.path).sort()).toEqual([...actual].sort());
    expect(new Set(appRoutes.map((route) => route.path)).size).toBe(appRoutes.length);
  });

  it('links only concrete, existing local entry points and never fabricates IDs or tokens', () => {
    const paths = new Set(appRoutes.map((route) => route.path));
    for (const route of appRoutes) {
      if (!route.href) { expect(route.note.length).toBeGreaterThan(0); continue; }
      expect(route.href).toMatch(/^\/(?!\/)/);
      expect(route.href).not.toMatch(/[\[\]]/);
      expect(paths.has(route.href)).toBe(true);
    }
    expect(appRoutes.find((r) => r.path === '/sign/[token]')?.href).toBeUndefined();
    expect(appRoutes.find((r) => r.path === '/onboarding/site')?.href).toBeUndefined();
    expect(appRoutes.find((r) => r.path === '/admin/branding')?.href).toBe('/admin/launch-kit');
  });

  it('searches exact paths, feature names, and access notes', () => {
    expect(searchAppRoutes('/vibes taxonomy').map((r) => r.path)).toEqual(['/vibes/taxonomy']);
    expect(searchAppRoutes('kitchen').map((r) => r.path)).toEqual(['/grill/kds']);
    expect(searchAppRoutes('realtor').some((r) => r.path === '/dashboard')).toBe(true);
    expect(searchAppRoutes('no-such-route-name')).toEqual([]);
  });

  it('documents every catalog path near the top of the root README', () => {
    const readme = readFileSync(path.resolve('../../README.md'), 'utf8');
    const inventory = readme.split('<!-- app-route-catalog:start -->')[1]?.split('<!-- app-route-catalog:end -->')[0];
    expect(inventory).toBeDefined();
    for (const route of appRoutes) expect(inventory).toContain('`' + route.path + '`');
    expect(readme.indexOf('<!-- app-route-catalog:start -->')).toBeLessThan(readme.indexOf('## What It Does'));
  });
});
