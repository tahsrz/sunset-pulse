import { describe, expect, it } from 'vitest';
import {
  LOCATION_GUESS_DECK,
  evaluateLocationGuess,
  getLocationGuessStreamListing,
  getLocationGuessTotal,
  normalizePropertyForLocationGuess
} from '@/lib/location-guess/game';

describe('location guess game rules', () => {
  it('awards a perfect score for exact coordinate guesses', () => {
    const result = evaluateLocationGuess([-97.7667, 33.4334], [-97.7667, 33.4334]);

    expect(result.distanceMiles).toBe(0);
    expect(result.roundScore).toBe(1000);
    expect(result.label).toBe('bullseye');
  });

  it('scores farther guesses lower and marks over-30-mile guesses as lost', () => {
    const close = evaluateLocationGuess([-97.7667, 33.4334], [-97.77, 33.44]);
    const lost = evaluateLocationGuess([-97.7667, 33.4334], [-96.8, 32.8]);

    expect(close.roundScore).toBeGreaterThan(lost.roundScore);
    expect(close.label).toBe('bullseye');
    expect(lost.label).toBe('lost');
  });

  it('totals completed round scores', () => {
    const results = [
      evaluateLocationGuess([-97.7667, 33.4334], [-97.7667, 33.4334]),
      evaluateLocationGuess([-97.7667, 33.4334], [-96.8, 32.8])
    ];

    expect(getLocationGuessTotal(results)).toBe(results[0].roundScore + results[1].roundScore);
  });

  it('cycles through the listing deck as an endless stream', () => {
    expect(LOCATION_GUESS_DECK.length).toBeGreaterThanOrEqual(5);
    expect(getLocationGuessStreamListing(0).id).toBe(LOCATION_GUESS_DECK[0].id);
    expect(getLocationGuessStreamListing(LOCATION_GUESS_DECK.length).id).toBe(LOCATION_GUESS_DECK[0].id);
    expect(getLocationGuessStreamListing(-1).id).toBe(LOCATION_GUESS_DECK[LOCATION_GUESS_DECK.length - 1].id);
  });

  it('normalizes property grid records into safe location cards', () => {
    const card = normalizePropertyForLocationGuess({
      _id: 'geo_1',
      name: 'Hidden Creek Home',
      type: 'Single Family',
      source: 'MLS',
      location: { city: 'Bowie', county: 'Montague' },
      location_geo: { type: 'Point', coordinates: ['-97.848', '33.559'] },
      images: ['https://images.example.com/bowie.jpg'],
      beds: 3,
      baths: 2,
      square_feet: '2,150',
      acreage: 1.25,
      year_built: 2017
    });

    expect(card).toEqual(expect.objectContaining({
      id: 'geo_1',
      title: 'Hidden Creek Home',
      city: 'Bowie',
      county: 'Montague',
      image: 'https://images.example.com/bowie.jpg',
      actualCoordinates: [-97.848, 33.559],
      beds: 3,
      baths: 2,
      squareFeet: 2150,
      acreage: 1.25,
      yearBuilt: 2017,
      propertyType: 'Single Family',
      source: 'MLS'
    }));
  });

  it('does not create location cards without valid coordinates, city, or image', () => {
    expect(normalizePropertyForLocationGuess({
      location: { city: 'Bowie' },
      location_geo: { coordinates: [999, 33.5] },
      images: ['https://images.example.com/home.jpg']
    })).toBeNull();

    expect(normalizePropertyForLocationGuess({
      location_geo: { coordinates: [-97.8, 33.5] },
      images: ['https://images.example.com/home.jpg']
    })).toBeNull();

    expect(normalizePropertyForLocationGuess({
      location: { city: 'Bowie' },
      location_geo: { coordinates: [-97.8, 33.5] }
    })).toBeNull();

    expect(normalizePropertyForLocationGuess({
      location: { city: 'Bowie' },
      location_geo: { coordinates: [-97.8, 33.5] },
      images: ['sample/IMG-123.jpg']
    })).toBeNull();
  });
});
