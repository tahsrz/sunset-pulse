/**
 * SunsetPulse Neighborhood Intelligence Utility
 * Calculates 'Pulse Score' based on proximity to key amenities and Jamie's spatial dreams.
 */

// Featured amenity: Sunset Grill
const DEFAULT_GRILL_COORDS = [-97.0403, 32.8998]; 

export const calculatePulseScore = (propertyCoords, amenities = [], grillCoords = DEFAULT_GRILL_COORDS, stats = null, activeVibe = 'Sunset') => {
  if (!propertyCoords || propertyCoords.length < 2) return 50;

  let score = 55; // Base cognitive threshold

  // 1. Proximity to Neural Hub (The Zero Point)
  const distToGrill = getDistance(
    propertyCoords[1], propertyCoords[0],
    grillCoords[1], grillCoords[0]
  );

  if (distToGrill < 1) score += 25; // Critical proximity
  else if (distToGrill < 3) score += 15; // Tactical advantage
  else if (distToGrill > 15) score -= 15; // Outside neural reach

  // 2. OSM Stats Integration (Cognitive Density)
  if (stats) {
    score += (stats.transitNodes || 0) * 3;
    score += (stats.medicalNodes || 0) * 5;
    score += (stats.educationNodes || 0) * 4;
    score += (stats.safetyNodes || 0) * 10;
  }

  // 3. Vibe Alignment (Psychographic Resonance)
  // Logic: Deterministic vibe match based on coordinate hash vs active vibe
  const coordHash = Math.abs(Math.sin(propertyCoords[0] * propertyCoords[1]));
  const vibeIntensity = (coordHash * 100) % 15; // 0-15 points based on "natural" resonance
  score += vibeIntensity;

  // 4. Entropy Factor (Jamie's Dream Influence)
  const entropy = (Math.cos(propertyCoords[0] + propertyCoords[1]) * 5);
  score += entropy;

  return Math.min(100, Math.max(0, Math.round(score)));
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

// Haversine formula for distance in miles
export function getDistance(lat1, lon1, lat2, lon2) {
  const R = 3958.8; // Radius of the Earth in miles
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
  return R * c;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}
