import { describe, expect, it } from 'vitest';
import {
  VALUE_GUESS_DECK,
  evaluateValueGuess,
  getNextValueGuessStreak,
  getValueGuessStreamListing,
  getValueGuessTotal,
  normalizePropertyForValueGuess,
  parseGuessInput
} from '@/lib/value-guess/game';

describe('value guess game rules', () => {
  it('parses currency-style guess input into dollars', () => {
    expect(parseGuessInput('$425,000')).toBe(425000);
    expect(parseGuessInput('425000')).toBe(425000);
    expect(parseGuessInput('')).toBe(0);
  });

  it('marks guesses above the actual value as a bust with zero points', () => {
    const result = evaluateValueGuess(415000, 415001);

    expect(result.wentOver).toBe(true);
    expect(result.keepsStreak).toBe(false);
    expect(result.roundScore).toBe(0);
    expect(result.label).toBe('bust');
  });

  it('awards a perfect score for exact value guesses', () => {
    const result = evaluateValueGuess(415000, 415000);

    expect(result.wentOver).toBe(false);
    expect(result.keepsStreak).toBe(true);
    expect(result.difference).toBe(0);
    expect(result.roundScore).toBe(1000);
    expect(result.label).toBe('perfect');
  });

  it('keeps under-value guesses alive and scores by closeness', () => {
    const sharp = evaluateValueGuess(500000, 490000);
    const wide = evaluateValueGuess(500000, 440000);

    expect(sharp.wentOver).toBe(false);
    expect(wide.wentOver).toBe(false);
    expect(sharp.keepsStreak).toBe(true);
    expect(wide.keepsStreak).toBe(true);
    expect(sharp.roundScore).toBeGreaterThan(wide.roundScore);
    expect(sharp.label).toBe('sharp');
    expect(wide.label).toBe('wide');
  });

  it('marks very low under-value guesses as misses that reset the streak', () => {
    const result = evaluateValueGuess(525000, 250000);

    expect(result.wentOver).toBe(false);
    expect(result.keepsStreak).toBe(false);
    expect(result.roundScore).toBe(0);
    expect(result.label).toBe('miss');
    expect(getNextValueGuessStreak(result, 4)).toBe(0);
  });

  it('totals only completed round scores', () => {
    const results = [
      evaluateValueGuess(500000, 500000),
      evaluateValueGuess(500000, 520000),
      evaluateValueGuess(500000, 450000)
    ];

    expect(getValueGuessTotal(results)).toBe(1750);
  });

  it('advances streaks for safe guesses and resets on busts', () => {
    const safe = evaluateValueGuess(500000, 490000);
    const bust = evaluateValueGuess(500000, 510000);
    const miss = evaluateValueGuess(500000, 300000);

    expect(getNextValueGuessStreak(safe, 0)).toBe(1);
    expect(getNextValueGuessStreak(safe, 4)).toBe(5);
    expect(getNextValueGuessStreak(bust, 4)).toBe(0);
    expect(getNextValueGuessStreak(miss, 4)).toBe(0);
  });

  it('cycles through the listing deck as an endless stream', () => {
    expect(getValueGuessStreamListing(0).id).toBe(VALUE_GUESS_DECK[0].id);
    expect(getValueGuessStreamListing(VALUE_GUESS_DECK.length).id).toBe(VALUE_GUESS_DECK[0].id);
    expect(getValueGuessStreamListing(VALUE_GUESS_DECK.length + 1).id).toBe(VALUE_GUESS_DECK[1].id);
    expect(getValueGuessStreamListing(-1).id).toBe(VALUE_GUESS_DECK[VALUE_GUESS_DECK.length - 1].id);
  });

  it('normalizes property grid records into safe game cards', () => {
    const card = normalizePropertyForValueGuess({
      _id: 'prop_1',
      name: 'Oak Street Test Home',
      type: 'Single Family',
      source: 'MLS',
      location: { city: 'Dallas', county: 'Dallas' },
      list_price: 625000,
      price_type: 'sale',
      images: ['https://images.example.com/home.jpg'],
      beds: 4,
      baths: 3,
      square_feet: 2450,
      acreage: 0.21,
      year_built: 2019
    });

    expect(card).toEqual(expect.objectContaining({
      id: 'prop_1',
      title: 'Oak Street Test Home',
      city: 'Dallas',
      county: 'Dallas',
      image: 'https://images.example.com/home.jpg',
      actualValue: 625000,
      beds: 4,
      baths: 3,
      squareFeet: 2450,
      acreage: 0.21,
      yearBuilt: 2019,
      propertyType: 'Single Family',
      source: 'MLS'
    }));
    expect(card?.signal).toContain('synced MLS listing');
  });

  it('does not create stream cards without a sale value, city, or image', () => {
    expect(normalizePropertyForValueGuess({
      location: { city: 'Dallas' },
      list_price: 625000,
      price_type: 'sale'
    })).toBeNull();

    expect(normalizePropertyForValueGuess({
      location: { city: 'Dallas' },
      images: ['https://images.example.com/home.jpg'],
      price_type: 'lease',
      rates: { monthly: 2500 }
    })).toBeNull();

    expect(normalizePropertyForValueGuess({
      images: ['https://images.example.com/home.jpg'],
      list_price: 625000,
      price_type: 'sale'
    })).toBeNull();

    expect(normalizePropertyForValueGuess({
      location: { city: 'Dallas' },
      images: ['sample/IMG-123.jpg'],
      list_price: 625000,
      price_type: 'sale'
    })).toBeNull();
  });

  it('ships a complete local training deck with images and hidden values', () => {
    expect(VALUE_GUESS_DECK.length).toBeGreaterThanOrEqual(5);
    expect(VALUE_GUESS_DECK.every((listing) => listing.image.startsWith('/images/properties/'))).toBe(true);
    expect(VALUE_GUESS_DECK.every((listing) => listing.actualValue > 0)).toBe(true);
  });
});
