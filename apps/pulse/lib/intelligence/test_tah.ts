import { getNeighborhoodIntel } from './neighborhoodIntel';

async function testRetrieval() {
  console.log('--- TESTING TAH RETRIEVAL ---');
  
  const cities = ['Dallas', 'Keller', 'Bowie', 'Fort Worth', 'Unknown'];
  
  for (const city of cities) {
    const intel = await getNeighborhoodIntel(city);
    console.log(`\nCity: ${city}`);
    console.log(`Vibe: ${intel.vibe}`);
    console.log(`Fact: ${intel.fact}`);
    console.log(`Amenity: ${intel.amenity}`);
  }
}

testRetrieval();
