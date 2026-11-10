import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { asSchema } from 'ai';
vi.mock('@/lib/data/listingDiscovery', () => ({ discoverListings: vi.fn() }));
import { jamieAiSdkTools } from '@/lib/ai/jamieTools';

describe('patched validator integrations', () => {
  it('rejects an oversized bounded collection before validating its elements', () => {
    const checkElement = vi.fn(() => true);
    const schema = z.array(z.string().refine(checkElement)).max(5);
    const result = schema.safeParse(Array(10_000).fill('item'));
    expect(result.success).toBe(false);
    expect(checkElement).not.toHaveBeenCalled();
    if (!result.success) expect(result.error.issues).toHaveLength(1);
  });

  it('converts and validates the real Jamie tool schema through the installed AI SDK', async () => {
    const schema = asSchema(jamieAiSdkTools.search_properties.inputSchema);
    const json = await schema.jsonSchema;
    expect(json.type).toBe('object');
    expect(json.properties).toHaveProperty('price_min');
    expect(json.required || []).not.toContain('price_min');
    if (!schema.validate) throw new Error('The tool validator is missing.');
    expect(await schema.validate({ city: 'Keller', price_min: '250000' })).toMatchObject({
      success: true, value: { city: 'Keller', price_min: 250000 },
    });
    expect(await schema.validate({ price_min: 'not-a-price' })).toMatchObject({ success: false });
  });
});
