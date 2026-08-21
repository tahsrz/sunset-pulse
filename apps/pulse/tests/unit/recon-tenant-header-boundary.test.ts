import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const routePath = path.join(process.cwd(), 'app/api/properties/[id]/recon/route.ts');

describe('recon tenant configuration boundary', () => {
  it('does not select site configuration from a browser-supplied agent header', () => {
    const source = fs.readFileSync(routePath, 'utf8');

    expect(source).not.toContain('x-sunset-tenant-agent-id');
    expect(source).not.toMatch(/from\(['"]site_config['"]\)/);
    expect(source).toContain('authoritative host-derived TenantContext');
  });
});
