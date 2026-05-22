// Stress Test for IdentityBloomFilter
// We are simulating the "Identity Purifier" performance under load.

const fs = require('fs');
const path = require('path');

/**
 * Ported implementation for raw Node testing
 * (To avoid TS-node dependency issues in this environment)
 */
class IdentityBloomFilter {
  constructor(size = 100000, hashCount = 7) {
    this.size = size;
    this.hashCount = hashCount;
    this.bitArray = new Uint32Array(Math.ceil(size / 32));
  }

  getHashes(input) {
    const hashes = [];
    for (let i = 0; i < this.hashCount; i++) {
      let hash = 0;
      const seed = i * 31 + 17;
      for (let j = 0; j < input.length; j++) {
        hash = (hash * seed + input.charCodeAt(j)) % this.size;
      }
      hashes.push(hash);
    }
    return hashes;
  }

  add(username) {
    const hashes = this.getHashes(username.toLowerCase());
    hashes.forEach(h => {
      const index = Math.floor(h / 32);
      const bit = h % 32;
      this.bitArray[index] |= (1 << bit);
    });
  }

  isProbablyTaken(username) {
    const hashes = this.getHashes(username.toLowerCase());
    return hashes.every(h => {
      const index = Math.floor(h / 32);
      const bit = h % 32;
      return (this.bitArray[index] & (1 << bit)) !== 0;
    });
  }
}

async function runStressTest() {
  const SIZE = 100000;
  const HASHES = 7;
  const POPULATION_SIZE = 5000; // Simulating 5,000 existing users
  const TEST_SIZE = 10000;       // Testing 10,000 unique new usernames

  const filter = new IdentityBloomFilter(SIZE, HASHES);
  
  console.log(`🚀 [BLOOM_STRESS] Initializing filter with size ${SIZE} and ${HASHES} hashes.`);
  console.log(`📈 [BLOOM_STRESS] Populating filter with ${POPULATION_SIZE} "taken" usernames...`);

  // 1. Populate the filter
  const existingUsers = new Set();
  for (let i = 0; i < POPULATION_SIZE; i++) {
    const username = `user_existing_${i}`;
    filter.add(username);
    existingUsers.add(username);
  }

  // 2. Verify Zero False Negatives (Bloom Filter Property)
  let falseNegatives = 0;
  existingUsers.forEach(u => {
    if (!filter.isProbablyTaken(u)) falseNegatives++;
  });

  console.log(`✅ [BLOOM_STRESS] False Negatives: ${falseNegatives} (Should always be 0)`);

  // 3. Test False Positives
  console.log(`🔍 [BLOOM_STRESS] Testing ${TEST_SIZE} unique "new" usernames for false positives...`);
  let falsePositives = 0;
  for (let i = 0; i < TEST_SIZE; i++) {
    const username = `new_unique_user_${i}_${Math.random()}`;
    if (filter.isProbablyTaken(username)) {
      falsePositives++;
    }
  }

  const fpRate = (falsePositives / TEST_SIZE) * 100;
  console.log(`📊 [BLOOM_STRESS] False Positives found: ${falsePositives}`);
  console.log(`📊 [BLOOM_STRESS] False Positive Rate: ${fpRate.toFixed(4)}%`);

  if (fpRate < 0.1) {
    console.log("🟢 [STRESS_PASSED] Filter reliability is exceptional.");
  } else if (fpRate < 1.0) {
    console.log("🟡 [STRESS_WARNING] Filter reliability is acceptable, but consider increasing size.");
  } else {
    console.log("🔴 [STRESS_FAILED] False positive rate too high for production.");
  }
}

runStressTest();
