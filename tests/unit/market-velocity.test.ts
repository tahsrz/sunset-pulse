import { describe, it, expect } from 'vitest';
import { calculateMarketVelocity } from '@/lib/intelligence/marketVelocity';

describe('Market Velocity Intelligence', () => {
  it('should calculate low velocity for new markets (pre-maturation)', () => {
    const city = 'Bowie';
    // ageInDays = 1, inflection point x = 15
    const result = calculateMarketVelocity(city, 10, 300000, 1);
    
    // With 1 day, the timeFactor should be low
    expect(result.city).toBe(city);
    expect(result.velocityScore).toBeLessThan(50);
  });

  it('should calculate higher velocity as market matures', () => {
    const city = 'Decatur';
    // ageInDays = 30, well past inflection point x = 15
    const result = calculateMarketVelocity(city, 10, 300000, 30);
    
    expect(result.velocityScore).toBeGreaterThan(50);
  });

  it('should include a rationale in the result', () => {
    const result = calculateMarketVelocity('Sunset', 5, 250000, 15);
    expect(result.rationale).toBeDefined();
    expect(typeof result.rationale).toBe('string');
  });

  it('should reflect correct trend based on velocity score', () => {
    const upMarket = calculateMarketVelocity('GrowthCity', 100, 1000000, 60);
    if (upMarket.velocityScore > 70) {
      expect(upMarket.trend).toBe('UP');
    }
  });
});
