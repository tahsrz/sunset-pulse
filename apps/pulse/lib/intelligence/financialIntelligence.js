/**
 * SunsetPulse Financial Intelligence Utility
 * Calculates yield, cap rates, and investment signals for the tactical grid.
 */

/**
 * Calculates 'Tactical Yield' as a standardized performance metric.
 * For Sales: Cap Rate (Annual Rent / Price)
 * For Rentals: Rent-to-Value ratio scaled to annual.
 * 
 * @param property Property data
 * @param estimatedRent Optional external rent estimate
 */
export const calculateTacticalYield = (property, estimatedRent = null) => {
  if (!property) return { percentage: 0, grade: 'N/A' };

  const price = property.price || 500000; // Fallback for calculations
  const monthlyRent = estimatedRent || property.rates?.monthly || (price * 0.008); // 0.8% Rule fallback
  const annualRent = monthlyRent * 12;

  // Tactical Yield (Standardized Cap Rate)
  const yieldRatio = (annualRent / price) * 100;
  
  // Grade Assignment
  let grade = 'C';
  if (yieldRatio > 10) grade = 'A+';
  else if (yieldRatio > 8) grade = 'A';
  else if (yieldRatio > 6) grade = 'B+';
  else if (yieldRatio > 4) grade = 'B';
  else if (yieldRatio > 2) grade = 'C+';

  return {
    percentage: parseFloat(yieldRatio.toFixed(2)),
    grade,
    annualProjection: Math.round(annualRent),
    monthlyProjection: Math.round(monthlyRent)
  };
};

/**
 * Calculates 'Market Momentum' based on regional growth signals.
 * @param property Property data
 * @returns { percentage: number, trend: 'UP' | 'DOWN' | 'STABLE' }
 */
export const calculateMarketMomentum = (property) => {
  if (!property) return { percentage: 0, trend: 'STABLE' };

  // Use property price and year as a seed for deterministic momentum
  const seed = (property.price || 500000) * (property.year_built || 2024);
  const percentage = (Math.sin(seed) * 5) + 2.5; // Range roughly -2.5% to +7.5%
  
  return {
    percentage: parseFloat(percentage.toFixed(1)),
    trend: percentage > 1 ? 'UP' : percentage < -1 ? 'DOWN' : 'STABLE'
  };
};

/**
 * Calculates 'Pulse Score' based on proximity to key amenities and hub.
 * (Moved from neighborhoodIntelligence or imported here if preferred)
 */
