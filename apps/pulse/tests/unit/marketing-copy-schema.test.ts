import { describe, expect, it, vi } from 'vitest';
import config from '@/config/marketing_copy.json';
import { marketingCopySchema, serializeMarketingCopyDraft } from '@/lib/marketing/marketingCopySchema';
vi.mock('server-only', () => ({}));
import { loadMarketingCopy } from '@/lib/marketing/marketingCopy.server';

describe('marketing draft contract', () => {
  it('loads the complete published content and round-trips it without altering copy', () => {
    expect(loadMarketingCopy()).toEqual(config);
    expect(JSON.parse(serializeMarketingCopyDraft(config))).toEqual(config);
  });

  it('rejects unexpected fields, missing sections, blank copy, oversized values and collections', () => {
    expect(marketingCopySchema.safeParse({ ...config, publish: true }).success).toBe(false);
    expect(marketingCopySchema.safeParse({ ...config, cta: undefined }).success).toBe(false);
    expect(marketingCopySchema.safeParse({ ...config, hero: { ...config.hero, title: '  ' } }).success).toBe(false);
    expect(marketingCopySchema.safeParse({ ...config, hero: { ...config.hero, description: 'x'.repeat(2001) } }).success).toBe(false);
    expect(marketingCopySchema.safeParse({ ...config, faq: { ...config.faq, items: Array(41).fill(config.faq.items[0]) } }).success).toBe(false);
    expect(() => serializeMarketingCopyDraft({ ...config, features: {} })).toThrow();
  });
});
