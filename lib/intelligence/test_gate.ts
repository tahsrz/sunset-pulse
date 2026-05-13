import { syncPropertyToIntelligenceGrid } from './propertySync';

async function testListingGate() {
  console.log('--- TESTING LISTING GATE ---');

  const propertyData = {
    mls_id: 'TEST-IDX-001',
    name: 'Test Estate',
    location: { city: 'Keller', state: 'TX' },
    last_updated: '2026-05-12T00:00:00Z'
  };

  console.log('\n[TEST 1] Syncing property IN the gate (Should bypass)...');
  const result1 = await syncPropertyToIntelligenceGrid(propertyData);
  console.log(`Result 1: ${result1 === null ? 'BYPASSED' : 'SYNCED'}`);

  console.log('\n[TEST 2] Syncing property NOT in the gate (Should sync)...');
  const propertyData2 = { ...propertyData, last_updated: '2026-05-12T00:01:00Z' };
  const result2 = await syncPropertyToIntelligenceGrid(propertyData2);
  console.log(`Result 2: ${result2 === null ? 'BYPASSED' : 'SYNCED'}`);
}

// Mock database connection for test
testListingGate().catch(console.error);
