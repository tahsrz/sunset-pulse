import { describe, expect, it } from 'vitest';
import { parseVibeListQuery, serializeVibeListQuery } from '@/lib/cms/vibeListQuery';

describe('Vibe list query', () => {
  it('preserves a valid direct-link page and filters', () => {
    expect(parseVibeListQuery(new URLSearchParams('status=published&q=coastal&sort=title&dir=asc&taxonomyTerm=mood%3Acalm&page=2'))).toEqual({
      status: 'published', q: 'coastal', sort: 'title', direction: 'asc', taxonomyTerm: 'mood:calm', page: 2,
    });
  });

  it('rejects duplicate and unsupported values', () => {
    expect(parseVibeListQuery(new URLSearchParams('status=draft&status=published&sort=bogus&dir=sideways&page=0'))).toEqual({
      status: '', q: '', sort: 'updatedAt', direction: 'desc', taxonomyTerm: '', page: 1,
    });
  });

  it('rejects partially numeric page values', () => {
    expect(parseVibeListQuery(new URLSearchParams('page=2junk')).page).toBe(1);
  });

  it('serializes canonical public URL keys only', () => {
    expect(serializeVibeListQuery({ status: 'draft', q: 'coastal', sort: 'updatedAt', direction: 'desc', taxonomyTerm: 'mood:calm', page: 1 })).toBe('q=coastal&status=draft&taxonomyTerm=mood%3Acalm');
  });
});
