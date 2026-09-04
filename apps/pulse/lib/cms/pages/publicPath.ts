const RESERVED_TENANT_PATHS = new Set(['properties']);

export function cmsSlugForTenantPath(path: readonly string[]): string | null {
  if (path.length === 0) return 'home';
  if (path.length > 8) return null;
  try {
    const segments = path.map((part) => decodeURIComponent(part).trim().toLowerCase());
    if (RESERVED_TENANT_PATHS.has(segments[0])) return null;
    if (segments.some((slug) => !slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))) return null;
    const routePath = segments.join('/');
    return routePath.length <= 500 ? routePath : null;
  } catch {
    return null;
  }
}
