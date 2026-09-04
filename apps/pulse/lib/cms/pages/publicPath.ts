const RESERVED_TENANT_PATHS = new Set(['properties']);

export function cmsSlugForTenantPath(path: readonly string[]): string | null {
  if (path.length === 0) return 'home';
  if (path.length !== 1) return null;
  try {
    const slug = decodeURIComponent(path[0]).trim().toLowerCase();
    if (!slug || RESERVED_TENANT_PATHS.has(slug) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return null;
    return slug;
  } catch {
    return null;
  }
}
