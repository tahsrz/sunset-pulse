import connectDB from '@/config/database';
import Property from '@/models/Property';

// GET /api/properties/search
export const GET = async (request) => {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const location = searchParams.get('location');
    const propertyType = searchParams.get('propertyType');
    const polygon = searchParams.get('polygon'); // Expects comma-separated coords: lon1,lat1,lon2,lat2...
    const radius = searchParams.get('radius'); // Expects lon,lat,miles

    let query = {};

    // 1. Handle Spatial Queries
    if (polygon) {
      const coords = polygon.split(',').map(Number);
      const formattedCoords = [];
      for (let i = 0; i < coords.length; i += 2) {
        formattedCoords.push([coords[i], coords[i+1]]);
      }
      // Close the polygon if it's not closed
      if (formattedCoords[0][0] !== formattedCoords[formattedCoords.length-1][0] || 
          formattedCoords[0][1] !== formattedCoords[formattedCoords.length-1][1]) {
        formattedCoords.push(formattedCoords[0]);
      }

      query.location_geo = {
        $geoWithin: {
          $geometry: {
            type: 'Polygon',
            coordinates: [formattedCoords],
          },
        },
      };
    } else if (radius) {
      const [lon, lat, miles] = radius.split(',').map(Number);
      const radiusInRadians = miles / 3963.2; // Earth's radius in miles

      query.location_geo = {
        $geoWithin: {
          $centerSphere: [[lon, lat], radiusInRadians],
        },
      };
    } else if (location) {
      const locationPattern = new RegExp(location, 'i');
      query.$or = [
        { name: locationPattern },
        { description: locationPattern },
        { 'location.street': locationPattern },
        { 'location.city': locationPattern },
        { 'location.state': locationPattern },
        { 'location.zipcode': locationPattern },
      ];
    }

    // 2. Handle Property Type Filter
    if (propertyType && propertyType !== 'All') {
      const typePattern = new RegExp(propertyType, 'i');
      query.type = typePattern;
    }

    const properties = await Property.find(query);

    return new Response(JSON.stringify(properties), {
      status: 200,
    });
  } catch (error) {
    console.log(error);
    return new Response('Something went wrong', { status: 500 });
  }
};
