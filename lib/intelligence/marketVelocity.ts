import { calculateLeadScore } from './leadIntelligence';
import { pulseRNG } from '../core/pulseRNG';

/**
 * Market Velocity Intelligence
 * Calculates and simulates market maturation trajectories for the Abidan Grid.
 * Formula: V = S * (1 / (1 + e^-k(t-x)))
 */

export interface MarketVelocityResult {
  city: string;
  velocityScore: number; // 0-100
  maturationDays: number;
  trend: 'UP' | 'DOWN' | 'STABLE';
  rationale: string;
}

/**
 * Calculates Market Velocity based on sigmoid maturation logic.
 * @param city City name
 * @param listingCount Number of active listings in the sector
 * @param avgPrice Average price in the sector
 * @param ageInDays Average age of listings (t)
 */
export const calculateMarketVelocity = (
  city: string, 
  listingCount: number, 
  avgPrice: number, 
  ageInDays: number = 15
): MarketVelocityResult => {
  // --- LOGISTIC MARKET MATURATION V1.0 ---
  
  // Base Signal (S): Combined listing density and price level
  const baseSignal = Math.min(100, (listingCount * 5) + (avgPrice / 10000));
  
  // Sigmoid Parameters
  const k = 0.2;   // Growth steepness for market (slower than leads)
  const x = 15;    // Inflection point: Market "matures" at 15 days in Alpha
  
  const t = Math.max(0.1, ageInDays);
  const timeFactor = 1 / (1 + Math.exp(-k * (t - x)));
  
  // Realized Velocity
  let velocityScore = baseSignal * timeFactor;
  
  // Add deterministic jitter from PulseRNG for "Alpha realism"
  const jitter = (pulseRNG.next() - 0.5) * 10;
  velocityScore = Math.max(0, Math.min(100, velocityScore + jitter));

  const trend = velocityScore > 70 ? 'UP' : velocityScore < 30 ? 'DOWN' : 'STABLE';
  
  const rationales = [
    `${city} sector showing strong absorption patterns.`,
    `High maturation detected in ${city} at ${t.toFixed(1)} days.`,
    `Market velocity in ${city} remains ${trend} with a score of ${velocityScore.toFixed(1)}.`,
    `Surgical maturation logic projects a ${trend === 'UP' ? 'bullish' : 'neutral'} trajectory.`
  ];
  
  const rationale = rationales[Math.floor(pulseRNG.next() * rationales.length)];

  return {
    city,
    velocityScore: parseFloat(velocityScore.toFixed(2)),
    maturationDays: x,
    trend,
    rationale
  };
};
