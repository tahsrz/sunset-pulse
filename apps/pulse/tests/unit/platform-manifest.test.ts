import { describe, expect, it } from 'vitest';
import { appManifestSchema, appInstallInputSchema, parseManifestValues } from '@/lib/platform/contracts/appManifest';
import property from '@/lib/platform/apps/manifests/real-estate-readiness.v1.json';
import content from '@/lib/platform/apps/manifests/client-content-review.v1.json';

describe('inert pinned app manifests', () => {
  it.each([property, content])('accepts reviewed $key without implying tool execution', (fixture) => {
    expect(appManifestSchema.parse(fixture)).toEqual(fixture);
    expect(fixture.capabilities).toEqual([]);
  });
  it.each(['code', 'import', 'ref', 'capability', 'node', 'duplicates', 'unknown-field'])('rejects unsupported %s', (kind) => {
    const manifest = structuredClone(property) as any;
    if (kind === 'code') manifest.script = 'fetch(process.env.SECRET)';
    if (kind === 'import') manifest.workflows[0].nodes[0].import = './arbitrary.js';
    if (kind === 'ref') manifest.inputSchema.$ref = 'https://external.example/schema';
    if (kind === 'capability') manifest.capabilities = [{ tool: 'send_email' }];
    if (kind === 'node') manifest.workflows[0].nodes[0].kind = 'capability';
    if (kind === 'duplicates') manifest.workflows.push(manifest.workflows[0]);
    if (kind === 'unknown-field') manifest.settingsSchema.properties.area.transform = 'eval';
    expect(appManifestSchema.safeParse(manifest).success).toBe(false);
  });
  it('enforces required settings and enum values without coercion', () => {
    const schema = appManifestSchema.parse(property).settingsSchema;
    expect(parseManifestValues(schema, { area: 'keller-westlake' })).toEqual({ area: 'keller-westlake' });
    for (const bad of [{}, { area: 'Dallas' }, { area: true }, { area: 'keller-westlake', secret: 'x' }]) {
      expect(() => parseManifestValues(schema, bad)).toThrow();
    }
  });
  it('validates numeric bounds and booleans', () => {
    const manifest = structuredClone(property) as any;
    manifest.settingsSchema = { type: 'object', additionalProperties: false, required: ['count','review'], properties: {
      count: { type: 'number', minimum: 1, maximum: 3 }, review: { type: 'boolean' },
    } };
    const schema = appManifestSchema.parse(manifest).settingsSchema;
    expect(parseManifestValues(schema, { count: 2, review: false })).toEqual({ count: 2, review: false });
    expect(() => parseManifestValues(schema, { count: 4, review: 'true' })).toThrow();
  });
  it('requires explicit install revision and matching settings', () => {
    expect(appInstallInputSchema.safeParse({ manifest: property, settings: { area: 'keller-westlake' }, status: 'installed', expectedRevision: null }).success).toBe(true);
    expect(appInstallInputSchema.safeParse({ manifest: property, settings: {}, status: 'installed', expectedRevision: null }).success).toBe(false);
  });
});
