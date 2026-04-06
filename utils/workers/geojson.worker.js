
let storedResults = [];
let storedValuations = [];

self.onmessage = function(e) {
  const { results, valuations } = e.data;

  // Update stored data if provided
  if (results !== undefined) storedResults = results;
  if (valuations !== undefined) storedValuations = valuations;

  const features = [];

  // Map properties (results)
  for (let i = 0; i < storedResults.length; i++) {
    const p = storedResults[i];
    if (p && p.location_geo && p.location_geo.coordinates) {
      features.push({
        type: 'Feature',
        id: p._id, // Set top-level ID for feature-state targeting
        properties: { 
          id: p._id,
          name: p.name,
          price: p.rates?.monthly || p.rates?.nightly || 0,
          category: p.type,
          dataType: 'property',
          trend: 1.0 
        },
        geometry: {
          type: 'Point',
          coordinates: [p.location_geo.coordinates[0], p.location_geo.coordinates[1]]
        }
      });
    }
  }

  // Map valuations
  for (let i = 0; i < storedValuations.length; i++) {
    const v = storedValuations[i];
    if (v && v.location_geo && v.location_geo.coordinates) {
      features.push({
        type: 'Feature',
        id: v._id, // Set top-level ID for feature-state targeting
        properties: {
          id: v._id,
          name: v.address,
          price: v.estimate,
          category: 'Valuation',
          dataType: 'valuation',
          trend: v.ml_adjustments?.price_trend_index || 1.0 
        },
        geometry: {
          type: 'Point',
          coordinates: [v.location_geo.coordinates[0], v.location_geo.coordinates[1]]
        }
      });
    }
  }

  self.postMessage({
    type: 'FeatureCollection',
    features
  });
};
