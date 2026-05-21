import { listPulseCartridges, PulseCartridge } from '../lib/ai/brain/pulse_query';
import { getCartridgeMetadata } from '../lib/ai/brain/cartridge_metadata';
import { CARTRIDGE_DOMAINS } from '../lib/ai/brain/cartridge_domains';
import { getCartridgeSearchQuery } from '../lib/ai/brain/cartridge_query';

const allCartridges = listPulseCartridges();
console.log('Original cartridges count:', allCartridges.length);

// Dry-run the consolidation logic
const uniqueGroups = new Map<string, PulseCartridge>();

for (const cartridge of allCartridges) {
  const searchQuery = getCartridgeSearchQuery(cartridge);
  const existing = uniqueGroups.get(searchQuery);
  if (!existing) {
    uniqueGroups.set(searchQuery, cartridge);
  } else {
    const existingMatch = existing.name.match(/\d+/);
    const currentMatch = cartridge.name.match(/\d+/);
    const existingTime = existingMatch ? Number(existingMatch[0]) : 0;
    const currentTime = currentMatch ? Number(currentMatch[0]) : 0;

    if (currentTime > existingTime) {
      uniqueGroups.set(searchQuery, cartridge);
    }
  }
}

const consolidated = Array.from(uniqueGroups.values()).sort((a, b) => a.name.localeCompare(b.name));
console.log('Consolidated cartridges count:', consolidated.length);

const domainCounts: Record<string, number> = {};
const domainSamples: Record<string, string[]> = {};

for (const d of CARTRIDGE_DOMAINS) {
  domainCounts[d.id] = 0;
  domainSamples[d.id] = [];
}

for (const c of consolidated) {
  const meta = getCartridgeMetadata(c);
  const domainId = meta.domain.id;
  domainCounts[domainId] = (domainCounts[domainId] || 0) + 1;
  domainSamples[domainId].push(`${c.name} (${meta.displayTitle})`);
}

console.log('\n--- Consolidated Domain Counts ---');
for (const [domainId, count] of Object.entries(domainCounts)) {
  console.log(`${domainId}: ${count}`);
}

console.log('\n--- Consolidated AI & Learning cartridges ---');
console.log(domainSamples['ai']);
