import { describe, expect, it } from 'vitest';
import Property from '@/models/Property';
import { buildPropertyQuery } from '@/lib/core/propertyQueryBuilder';

describe('public legacy property queries', () => {
  it('requires an explicit public flag recognized by the Mongo model', () => {
    const { query } = buildPropertyQuery({ includeDemo: 'false', publicOnly: 'true' });

    expect(Property.schema.path('display_public')).toBeDefined();
    expect((query as Record<string, unknown>).display_public).toBe(true);
  });
});
