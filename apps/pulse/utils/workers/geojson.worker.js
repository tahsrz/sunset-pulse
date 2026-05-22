
let storedResults = [];
let storedValuations = [];

self.onmessage = function(e) {
  const { results, valuations } = e.data;

  // Update stored data if provided
  if (results !== undefined) storedResults = results;
  if (valuations !== undefined) storedValuations = valuations;

  const features = [];

  // Helper to calculate yield: (Annual Rent / Est. Value) * 100
  const calculateYield = (monthlyRate, estimate) => {
    if (!monthlyRate || !estimate) return 5.42; // Default fallback
    return parseFloat(((monthlyRate * 12) / estimate * 100).toFixed(2));
  };

  // Map properties (results)
  for (let i = 0; i < storedResults.length; i++) {
    const p = storedResults[i];
    if (p && p.location_geo && p.location_geo.coordinates) {
      const monthlyRate = p.rates?.monthly || (p.rates?.nightly ? p.rates.nightly * 30 : 0);
      // Mock an estimate if not present for properties (Price / 0.05 capitalization rate as proxy)
      const mockEstimate = monthlyRate ? (monthlyRate * 12) / 0.06 : 500000;
      
      const yieldVal = calculateYield(monthlyRate, mockEstimate);

      features.push({
        type: 'Feature',
        id: p._id,
        properties: { 
          id: p._id,
          name: p.name,
          price: monthlyRate,
          category: p.type,
          dataType: 'property',
          // Trend is used for heatmap weight. Map price to a 0.8 - 1.2 range for the current layer config
          trend: 0.8 + (Math.min(monthlyRate, 10000) / 10000) * 0.4,
          yield: yieldVal
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
      // Find a matching property to get rent if possible
      const matchingProp = storedResults.find(p => p.location?.street === v.address?.split(',')[0]);
      const monthlyRate = matchingProp?.rates?.monthly || (v.estimate * 0.005); // Mock 0.5% monthly rent
      
      const yieldVal = calculateYield(monthlyRate, v.estimate);

      features.push({
        type: 'Feature',
        id: v._id,
        properties: {
          id: v._id,
          name: v.address,
          price: v.estimate,
          category: 'Valuation',
          dataType: 'valuation',
          trend: v.ml_adjustments?.price_trend_index || 1.0,
          yield: yieldVal
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
