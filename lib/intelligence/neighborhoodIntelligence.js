/**
 * SunsetPulse Neighborhood Intelligence Utility
 * Calculates 'Pulse Score' based on proximity to key amenities and Jamie's spatial dreams.
 */

// Featured amenity: Sunset Grill
const SUNSET_GRILL_COORDS = [-97.7431, 30.2672]; // Center of Austin for now, should be dynamic

export const calculatePulseScore = (propertyCoords, amenities = []) => {
  if (!propertyCoords || propertyCoords.length < 2) return 50;

  let score = 70; // Base score

  // 1. Proximity to Sunset Grill (The Hub)
  const distToGrill = getDistance(
    propertyCoords[1], propertyCoords[0],
    SUNSET_GRILL_COORDS[1], SUNSET_GRILL_COORDS[0]
  );

  if (distToGrill < 1) score += 20; // Within 1 mile
  else if (distToGrill < 3) score += 10; // Within 3 miles
  else score -= 10; // Too far from the burger intel

  // 2. Density of local amenities
  const amenityBonus = Math.min(amenities.length * 2, 10);
  score += amenityBonus;

  return Math.min(100, Math.max(0, Math.round(score)));
};

// Haversine formula for distance in miles
function getDistance(lat1, lon1, lat2, lon2) {
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
