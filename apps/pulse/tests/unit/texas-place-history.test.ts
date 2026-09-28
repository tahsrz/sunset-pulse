import { describe, expect, it } from 'vitest';
import { getTexasPlaceHistory } from '@/lib/tah/texasPlaceHistory';

describe('Sunset place history sourcing', () => {
  it('separates sourced town history from current station details', () => {
    const sunset = getTexasPlaceHistory('sunset');

    expect(sunset).toBeDefined();
    expect(sunset?.sources).toEqual(expect.arrayContaining([
      expect.objectContaining({
        label: 'Handbook of Texas',
        url: 'https://www.tshaonline.org/handbook/entries/sunset-tx',
      }),
      expect.objectContaining({
        label: 'Current station details (Valero)',
        url: expect.stringContaining('locations.valero.com'),
      }),
    ]));
    expect(sunset?.landmark.description).toContain('quick-service restaurant');
    expect(sunset?.landmark.description).toContain('do not establish a historical connection');
    expect(sunset?.landmark.address).toBe('101 S Council Dr, Sunset, TX 76270');
    expect(sunset?.landmark.imageAlt).toContain('Stylized illustration');
  });
});
