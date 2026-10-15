import { describe, expect, it } from 'vitest';
import { normalizeRepliersImages } from '@/lib/data/repliersMls';

describe('Repliers photo URLs', () => {
  it('resolves provider-relative image paths against the Repliers CDN', () => {
    expect(normalizeRepliersImages([
      'sample/IMG-MFRA4595929_0.jpg',
      'area/IMG-N8418368_1.jpg',
    ], 'listing-1')).toEqual([
      'https://cdn.repliers.io/sample/IMG-MFRA4595929_0.jpg',
      'https://cdn.repliers.io/area/IMG-N8418368_1.jpg',
    ]);
  });

  it('keeps full and local URLs and rejects unsafe relative paths', () => {
    expect(normalizeRepliersImages([
      'https://images.example.test/home.jpg',
      '/images/home.jpg',
      '../outside.jpg',
      '//images.example.test/home.jpg',
    ], 'listing-2')).toEqual([
      'https://images.example.test/home.jpg',
      '/images/home.jpg',
    ]);
  });
});
