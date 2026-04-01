import connectDB from '@/config/database';
import Property from '@/models/Property';
import { mlsService } from '@/lib/data/mls';

/**
 * GET /api/properties/search/advanced
 * Parameters:
 * - location: string (address, city, zip)
 * - propertyType: string (RV, House, Apartment, etc.)
 * - minPrice: number
 * - maxPrice: number
 * - minBeds: number
 * - minBaths: number
 * - amenities: string (comma separated)
 * - polygon: string (lon1,lat1,lon2,lat2...)
 * - radius: string (lon,lat,miles)
 * - includeMLS: boolean (defaults to true)
 */
export const GET = async (request) => {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const location = searchParams.get('location');
    const propertyType = searchParams.get('propertyType');
    const minPrice = parseInt(searchParams.get('minPrice')) || 0;
    const maxPrice = parseInt(searchParams.get('maxPrice')) || Number.MAX_SAFE_INTEGER;
    const minBeds = parseInt(searchParams.get('minBeds')) || 0;
    const minBaths = parseInt(searchParams.get('minBaths')) || 0;
    const amenities = searchParams.get('amenities')?.split(',') || [];
    const polygon = searchParams.get('polygon');
    const radius = searchParams.get('radius');
    const includeMLS = searchParams.get('includeMLS') !== 'false';

    // 1. Internal MongoDB Query
    let query = {
      'rates.monthly': { $gte: minPrice, $lte: maxPrice },
      beds: { $gte: minBeds },
      baths: { $gte: minBaths },
    };

    if (propertyType && propertyType !== 'All') {
      query.type = new RegExp(propertyType, 'i');
    }

    if (amenities.length > 0) {
      query.amenities = { $all: amenities.map(a => new RegExp(a, 'i')) };
    }

    // Spatial Handling
    if (polygon) {
      const coords = polygon.split(',').map(Number);
      const formattedCoords = [];
      for (let i = 0; i < coords.length; i += 2) {
        formattedCoords.push([coords[i], coords[i+1]]);
      }
      if (formattedCoords[0][0] !== formattedCoords[formattedCoords.length-1][0] || 
          formattedCoords[0][1] !== formattedCoords[formattedCoords.length-1][1]) {
        formattedCoords.push(formattedCoords[0]);
      }
      query.location_geo = { $geoWithin: { $geometry: { type: 'Polygon', coordinates: [formattedCoords] } } };
    } else if (radius) {
      const [lon, lat, miles] = radius.split(',').map(Number);
      query.location_geo = { $geoWithin: { $centerSphere: [[lon, lat], miles / 3963.2] } };
    } else if (location) {
      const pattern = new RegExp(location, 'i');
      query.$or = [
        { name: pattern },
        { 'location.street': pattern },
        { 'location.city': pattern },
        { 'location.zipcode': pattern },
      ];
    }

    // Fetch Internal
    const internalProperties = await Property.find(query).lean();

    // 2. External MLS Integration (via Repliers.io bridge)
    let mlsProperties = [];
    if (includeMLS) {
      const mlsParams = {
        city: location,
        type: propertyType === 'All' ? '' : propertyType,
        minPrice,
        maxPrice,
        beds: minBeds,
        bathrooms: minBaths
      };
      // mlsService.getListings handles merging internally if called this way, 
      // but here we call it specifically for external stream.
      const mlsData = await mlsService.getListings(mlsParams);
      // Filter out internal matches if already present (based on ID or Address)
      mlsProperties = mlsData.filter(p => p.source === 'MLS');
    }

    const allResults = [...internalProperties, ...mlsProperties];

    return new Response(JSON.stringify(allResults), { status: 200 });
  } catch (error) {
    console.error('[ADVANCED_SEARCH_ERROR]', error);
    return new Response(JSON.stringify({ error: 'Search failed' }), { status: 500 });
  }
};
