/**
 * OpenStreetMap (OSM) Intelligence Client
 * Primary Signals: Amenity Density, Transit Accessibility, Retail Saturation, & Safety
 */

export async function fetchOSMAmenities(lat: number, lon: number, radius = 2000) {
  // Expanded Overpass QL: Signal Capture for multi-layer intelligence
  const query = `
    [out:json];
    (
      node["amenity"](around:${radius},${lat},${lon});
      node["leisure"](around:${radius},${lat},${lon});
      node["public_transport"](around:${radius},${lat},${lon});
      node["shop"](around:${radius},${lat},${lon});
      node["emergency"](around:${radius},${lat},${lon});
    );
    out tags;
  `;
  
  try {
    const res = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error('OSM Data Intercept Failed');
    
    const data = await res.json();
    const elements = data.elements || [];

    // Intelligence Categorization
    const stats = {
      totalAmenities: elements.length,
      transitNodes: elements.filter((e: any) => e.tags?.public_transport || e.tags?.amenity === 'bus_station' || e.tags?.highway === 'bus_stop').length,
      retailNodes: elements.filter((e: any) => e.tags?.shop).length,
      safetyNodes: elements.filter((e: any) => e.tags?.emergency || ['police', 'fire_station'].includes(e.tags?.amenity)).length,
      educationNodes: elements.filter((e: any) => ['school', 'university', 'kindergarten', 'library'].includes(e.tags?.amenity)).length,
      medicalNodes: elements.filter((e: any) => ['hospital', 'clinic', 'doctors', 'dentist', 'pharmacy'].includes(e.tags?.amenity)).length,
      leisureNodes: elements.filter((e: any) => e.tags?.leisure || ['park', 'garden'].includes(e.tags?.amenity)).length
    };

    return stats;
  } catch (e) {
    console.error('[OSM_RECON_ERROR]', e);
    // Conservative fallback profile
    return {
      totalAmenities: 10,
      transitNodes: 1,
      retailNodes: 4,
      safetyNodes: 1,
      educationNodes: 2,
      medicalNodes: 1,
      leisureNodes: 1
    };
  }
}
