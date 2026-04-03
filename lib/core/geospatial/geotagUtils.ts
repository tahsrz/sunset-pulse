import { setDefaults, fromAddress } from 'react-geocode';

/**
 * GeotagUtils: Bridge between location data and high-stakes satellite imagery.
 */

setDefaults({
  key: process.env.NEXT_PUBLIC_GOOGLE_GEOCODING_API_KEY,
  language: 'en',
  region: 'us',
});

/**
 * Fetches latitude and longitude for a given address string.
 */
export const getCoordsFromAddress = async (address: string) => {
  const key = process.env.NEXT_PUBLIC_GOOGLE_GEOCODING_API_KEY;
  if (!key) {
    console.warn('⚠️ [GEOTAG_UTILS] Google Geocoding API key missing.');
    return null;
  }

  try {
    const res = await fromAddress(address);
    if (res && res.results && res.results.length > 0) {
      return res.results[0].geometry.location;
    }
    return null;
  } catch (error: any) {
    if (error.message?.includes('ZERO_RESULTS')) {
      console.warn(`📍 [GEOTAG_UTILS] No results found for address: ${address}`);
    } else {
      console.error('[GEOTAG_UTILS] Geocoding Error:', error);
    }
    return null;
  }
};

/**
 * Generates a Mapbox Static Satellite Imagery URL for the given coordinates.
 * be used as a texture for the Fiber viewer.
 */
export const getSatelliteImageryUrl = (lat: number, lng: number, zoom: number = 18) => {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) return null;

  // Mapbox Static Images API: satellite-v9 style
  return `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/${lng},${lat},${zoom},0/800x800?access_token=${token}`;
};

/**
 * Helper to get a satellite texture URL directly from a property object.
 */
export const getPropertySatelliteUrl = async (property: any) => {
  const address = `${property.location.street} ${property.location.city} ${property.location.state} ${property.location.zipcode}`;
  const coords = await getCoordsFromAddress(address);
  
  if (coords) {
    return getSatelliteImageryUrl(coords.lat, coords.lng);
  }
  
  return null;
};
