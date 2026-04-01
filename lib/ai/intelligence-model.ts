// Intelligence Intelligence Model (Context Aggregator) - V2.0 (20 Census Vectors)
// Strictly non-protected classes (FHA Compliant).

export interface IntelligenceContext {
  property: {
    address: string;
    views: number;
    chatMinutes: number;
    tourRequested: boolean;
  };
  external: {
    attom?: { taxAmount: number; neighborhoodScore: number };
    osm?: { amenityCount: number; transitScore: number };
    census?: {
      // V1-10 (Socio-Economic)
      medianIncome: number;
      medianAge: number;
      homeownershipRate: number;
      bachelorsPlus: number;
      povertyRate: number;
      unemploymentRate: number;
      meanCommute: number;
      medianHomeValue: number;
      monthlyHousingCost: number;
      broadbandAccess: number;
      // V11-20 (Infrastructure & Economy)
      medianYearBuilt: number;
      wfhRate: number;
      transitRate: number;
      fireDensity: number;
      techDensity: number;
      rentBurden: number;
      migrationFlux: number;
      medianRooms: number;
      totalUnits: number;
      internetUbiquity: number;
    };
  };
}

export function buildGroqPrompt(context: IntelligenceContext) {
  const { property, external } = context;
  const c = external.census;
  
  return `
    Analyze the following lead for a real estate conversion.
    
    [ASSET] ${property.address}
    [INTENT] Views: ${property.views}, Chat: ${property.chatMinutes}m, Tour: ${property.tourRequested}
    
    [SOCIODEMOGRAPHIC_RECON (CENSUS - ECONOMIC)]
    - Purchase Power: $${c?.medianIncome || 'N/A'} (Age: ${c?.medianAge || 'N/A'})
    - Stability: Homeownership: ${c?.homeownershipRate || 'N/A'}%, Edu: ${c?.bachelorsPlus || 'N/A'}%
    - Local Market: Value: $${c?.medianHomeValue || 'N/A'}, Housing Cost: $${c?.monthlyHousingCost || 'N/A'}
    - Risk Indices: Poverty: ${c?.povertyRate || 'N/A'}%, Unemp: ${c?.unemploymentRate || 'N/A'}%
    
    [INFRASTRUCTURE_&_LABOR_RECON (CENSUS - ASSET/CONNECTIVITY)]
    - Asset Vintage: Median Built ${c?.medianYearBuilt || 'N/A'}
    - Connectivity: WFH: ${c?.wfhRate || 'N/A'}%, Transit: ${c?.transitRate || 'N/A'}%, Broadband: ${c?.broadbandAccess || 'N/A'}%
    - Econ Sectors: FIRE: ${c?.fireDensity || 'N/A'}%, Prof/Tech: ${c?.techDensity || 'N/A'}%
    - Market Flow: Migration: ${c?.migrationFlux || 'N/A'}%, Total Units: ${c?.totalUnits || 'N/A'}
    - Space/Stress: Rooms: ${c?.medianRooms || 'N/A'}, Rent Burden: ${c?.rentBurden || 'N/A'}%
    
    [ENVIRONMENTAL_RECON (OSM/ATTOM)]
    - Tax Index: ${external.attom?.taxAmount || 'N/A'}
    - Amenity Gravity: ${external.osm?.amenityCount || 'Low'}
    
    Provide a 2-sentence "operative strategy" and a "probability score (0-99)".
    DO NOT use protected class data (race, religion, sex, etc). Focus on economics and infrastructure.
  `;
}

export const shouldTriggerAI = (context: IntelligenceContext) => {
  return context.property.views > 2 && (context.external.osm || context.external.census);
};
