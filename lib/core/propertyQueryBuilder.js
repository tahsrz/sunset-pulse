/**
 * SunsetPulse Property Query Builder
 * Centralizes complex MongoDB queries for property searches.
 */

export const buildPropertyQuery = (searchParams) => {
  const query = {};

  // 1. Text Search (Name, Description, Location)
  if (searchParams.location) {
    const locationPattern = new RegExp(searchParams.location, 'i');
    query.$or = [
      { name: locationPattern },
      { description: locationPattern },
      { 'location.street': locationPattern },
      { 'location.city': locationPattern },
      { 'location.state': locationPattern },
      { 'location.zipcode': locationPattern },
    ];
  }

  // 2. Property Type
  if (searchParams.propertyType && searchParams.propertyType !== 'All') {
    query.type = searchParams.propertyType;
  }

  // 3. Beds/Baths
  if (searchParams.beds && searchParams.beds !== 'Any') {
    query.beds = { $gte: parseInt(searchParams.beds) };
  }
  if (searchParams.baths && searchParams.baths !== 'Any') {
    query.baths = { $gte: parseInt(searchParams.baths) };
  }

  // 4. Price Range (Monthly)
  if (searchParams.minPrice || searchParams.maxPrice) {
    query['rates.monthly'] = {};
    if (searchParams.minPrice) query['rates.monthly'].$gte = parseInt(searchParams.minPrice);
    if (searchParams.maxPrice) query['rates.monthly'].$lte = parseInt(searchParams.maxPrice);
  }

  // 5. Amenities
  if (searchParams.amenities) {
    const amenitiesList = Array.isArray(searchParams.amenities) 
      ? searchParams.amenities 
      : searchParams.amenities.split(',');
    query.amenities = { $all: amenitiesList.map(a => new RegExp(a, 'i')) };
  }

  // 6. RV Specific Filters
  if (searchParams.rvType && searchParams.rvType !== 'All') {
    query.rv_type = searchParams.rvType;
  }
  if (searchParams.minLength) {
    query.rv_length = { $gte: parseInt(searchParams.minLength) };
  }
  if (searchParams.water === 'true') query['hookups.water'] = true;
  if (searchParams.sewer === 'true') query['hookups.sewer'] = true;
  if (searchParams.electric && searchParams.electric !== 'None') {
    query['hookups.electric'] = searchParams.electric;
  }

  // 7. Geospatial Search (Polygon)
  if (searchParams.polygon) {
    const coords = searchParams.polygon.split(',').map(Number);
    const polygonCoords = [];
    for (let i = 0; i < coords.length; i += 2) {
      polygonCoords.push([coords[i], coords[i + 1]]);
    }
    
    // Ensure polygon is closed for MongoDB
    if (polygonCoords.length > 0 && (polygonCoords[0][0] !== polygonCoords[polygonCoords.length-1][0] || polygonCoords[0][1] !== polygonCoords[polygonCoords.length-1][1])) {
        polygonCoords.push(polygonCoords[0]);
    }

    query.location_geo = {
      $geoWithin: {
        $geometry: {
          type: 'Polygon',
          coordinates: [polygonCoords],
        },
      },
    };
  }

  // 5. Geospatial Search (Radius/Circle)
  if (searchParams.radius && searchParams.center) {
    const [lng, lat] = searchParams.center.split(',').map(Number);
    const radiusInMiles = parseFloat(searchParams.radius);
    
    query.location_geo = {
      $geoWithin: {
        $centerSphere: [[lng, lat], radiusInMiles / 3963.2],
      },
    };
  }

  return query;
};
