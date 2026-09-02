import { describe, expect, it } from 'vitest';
import { isValidVibeSlug, toVibeSlug, VIBE_SLUG_PATTERN } from '@/lib/cms/vibeSlug';

describe('Vibe slug helper', () => {
  it('normalizes titles into stable lowercase slugs', () => {
    expect(toVibeSlug(' Coastal Living & Design ')).toBe('coastal-living-design');
  });

  it('accepts only lowercase hyphenated identifiers', () => {
    expect(isValidVibeSlug('coastal-living')).toBe(true);
    expect(VIBE_SLUG_PATTERN.test('Coastal Living')).toBe(false);
    expect(isValidVibeSlug('coastal--living')).toBe(false);
    expect(isValidVibeSlug('coastal_ living')).toBe(false);
  });
});
