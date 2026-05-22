import { listPulseCartridges } from '../lib/ai/brain/pulse_query';
import { getCartridgeMetadata } from '../lib/ai/brain/cartridge_metadata';
import { CARTRIDGE_DOMAINS } from '../lib/ai/brain/cartridge_domains';

const cartridges = listPulseCartridges();
console.log('Total cartridges:', cartridges.length);

const domainCounts: Record<string, number> = {};
const domainSamples: Record<string, string[]> = {};

for (const d of CARTRIDGE_DOMAINS) {
  domainCounts[d.id] = 0;
  domainSamples[d.id] = [];
}

for (const c of cartridges) {
  const meta = getCartridgeMetadata(c);
  const domainId = meta.domain.id;
  domainCounts[domainId] = (domainCounts[domainId] || 0) + 1;
  domainSamples[domainId].push(`${c.name} (${meta.displayTitle})`);
}

console.log('--- Domain Counts ---');
for (const [domainId, count] of Object.entries(domainCounts)) {
  console.log(`${domainId}: ${count}`);
}

console.log('\n--- Sample of AI & Learning (ai) domain cartridges ---');
console.log(domainSamples['ai']?.slice(0, 50));
