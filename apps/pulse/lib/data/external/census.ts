// US Census Bureau (ACS 5-Year) Intelligence Client - V2.0 (20 Vectors)
// Strictly non-protected classes (FHA Compliant).
// Focus: Infrastructure, Economy, and Asset Quality.

export async function fetchDeepCensusData(state: string, county: string) {
  const baseUrl = 'https://api.census.gov/data/2022/acs/acs5';
  
  const variables = [
    // V1-10: Socio-Economic Basics
    'B19013_001E', // Median Income
    'B01002_001E', // Median Age
    'B25003_002E', // Owner-Occupied
    'B25003_001E', // Total Occupied
    'B15003_022E', // Bachelor's Degree
    'B17001_002E', // Poverty Count
    'B23025_005E', // Unemployed Count
    'B08136_001E', // Total Travel Time
    'B25077_001E', // Median Home Value
    'B28002_007E', // Broadband Access
    // V11-20: Infrastructure & Asset Quality (FHA Compliant)
    'B25035_001E', // Median Year Built (Vintage)
    'B08006_017E', // Work From Home (Remote Resilience)
    'B08006_008E', // Public Transit (Connectivity)
    'B24031_016E', // FIRE Industry Count
    'B24031_019E', // Professional/Tech Industry Count
    'B25070_007E', // Rent 30-34% (Stress)
    'B25070_008E', // Rent 35-39% (Stress)
    'B07001_017E', // Moved from different state (Flux)
    'B25041_001E', // Median Rooms (Capacity)
    'B25001_001E', // Total Housing Units (Liquidity)
  ].join(',');

  if (process.env.NEXT_PUBLIC_MOCK_MODE === 'true' || !process.env.CENSUS_API_KEY) {
    return {
      medianIncome: 72500,
      medianAge: 34.5,
      homeownershipRate: 68.2,
      bachelorsPlus: 42.1,
      povertyRate: 8.4,
      unemploymentRate: 3.2,
      meanCommute: 28.5,
      medianHomeValue: 345000,
      broadbandAccess: 94.2,
      medianYearBuilt: 1994,
      wfhRate: 15.4,
      transitRate: 4.2,
      fireDensity: 12.1,
      techDensity: 18.5,
      rentBurden: 24.1,
      migrationFlux: 5.8,
      medianRooms: 6.2,
      totalUnits: 12500,
      internetUbiquity: 98.1
    };
  }

  const url = `${baseUrl}?get=${variables}&for=county:${county}&in=state:${state}&key=${process.env.CENSUS_API_KEY}`;
  
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Census API Error');
    const [headers, values] = await res.json();
    
    return {
      medianIncome: parseFloat(values[0]),
      medianAge: parseFloat(values[1]),
      homeownershipRate: (parseFloat(values[2]) / parseFloat(values[3])) * 100,
      bachelorsPlus: parseFloat(values[4]),
      povertyRate: parseFloat(values[5]),
      unemploymentRate: parseFloat(values[6]),
      meanCommute: parseFloat(values[7]) / 60,
      medianHomeValue: parseFloat(values[8]),
      broadbandAccess: parseFloat(values[9]),
      medianYearBuilt: parseFloat(values[10]),
      wfhRate: parseFloat(values[11]),
      transitRate: parseFloat(values[12]),
      fireDensity: parseFloat(values[13]),
      techDensity: parseFloat(values[14]),
      rentBurden: parseFloat(values[15]) + parseFloat(values[16]),
      migrationFlux: parseFloat(values[17]),
      medianRooms: parseFloat(values[18]),
      totalUnits: parseFloat(values[19]),
      internetUbiquity: parseFloat(values[9]) // Using broadband as proxy
    };
  } catch (e) {
    return null;
  }
}
