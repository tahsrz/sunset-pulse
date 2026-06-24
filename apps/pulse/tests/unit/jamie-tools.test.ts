import { describe, expect, it } from 'vitest';
import { formatPropertySearchResult } from '@/lib/ai/jamieTools';

describe('Jamie tools', () => {
  it('formats property search results for the legacy Jamie display', () => {
    const summary = formatPropertySearchResult({
      total: 1,
      criteria: { location: 'Frisco' },
      properties: [
        {
          id: 'prop-1',
          name: 'Frisco Test Home',
          city: 'Frisco',
          state: 'TX',
          price: 750000,
          beds: 3,
          baths: 2,
          source: 'MLS',
          image: null,
          href: '/properties/prop-1',
        },
      ],
    });

    expect(summary).toContain('I found 1 matching property');
    expect(summary).toContain('Frisco Test Home');
    expect(summary).toContain('$750,000');
  });

  it('handles empty search results', () => {
    const summary = formatPropertySearchResult({
      total: 0,
      criteria: { location: 'Frisco' },
      properties: [],
    });

    expect(summary).toContain('did not find matching active listings');
  });
});
