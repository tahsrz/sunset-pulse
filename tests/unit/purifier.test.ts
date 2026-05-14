import { describe, it, expect, vi } from 'vitest';
import { detectDomain, calculateEntropy, checkRepetition, purifyText } from '@/lib/ai/purifier';

describe('Purifier Logic', () => {
  describe('detectDomain', () => {
    it('should detect real estate domain', () => {
      expect(detectDomain('Checking market zoning in Dallas')).toBe('real_estate');
    });

    it('should detect technical domain', () => {
      expect(detectDomain('Setting up a new API server for deployment')).toBe('technical');
    });

    it('should fallback to general for unknown domains', () => {
      expect(detectDomain('The quick brown fox jumps over the lazy dog')).toBe('general');
    });
  });

  describe('calculateEntropy', () => {
    it('should return 1.0 for short text', () => {
      expect(calculateEntropy('Hello.')).toBe(1.0);
    });

    it('should calculate variance for longer text', () => {
      const text = 'This is a sentence. This is another much longer sentence with many more words in it.';
      const entropy = calculateEntropy(text);
      expect(entropy).toBeGreaterThan(0);
      expect(entropy).toBeLessThanOrEqual(1.0);
    });
  });

  describe('checkRepetition', () => {
    it('should detect high repetition', () => {
      const text = 'Great awesome great awesome great awesome great awesome great awesome';
      const factor = checkRepetition(text);
      expect(factor).toBeGreaterThan(0.5);
    });

    it('should return 0 for non-repetitive text', () => {
      const text = 'The quick brown fox jumps over the lazy dog and runs away.';
      expect(checkRepetition(text)).toBe(0);
    });
  });

  describe('purifyText', () => {
    it('should handle short text gracefully', async () => {
      const result = await purifyText('Hi');
      expect(result.humanity_score).toBe(100);
      expect(result.rationale).toContain('too short');
    });

    it('should return a humanity score for normal text', async () => {
      const result = await purifyText('This is a normal sentence about real estate market trends in North Texas.');
      expect(result.humanity_score).toBeDefined();
      expect(typeof result.humanity_score).toBe('number');
    });
  });
});
