import { listPulseCartridges } from '../lib/ai/brain/pulse_query';
import { getCartridgeMetadata } from '../lib/ai/brain/cartridge_metadata';

const cartridges = listPulseCartridges();
const uniqueTitles: Record<string, number> = {};

for (const c of cartridges) {
  const meta = getCartridgeMetadata(c);
  const title = meta.displayTitle;
  uniqueTitles[title] = (uniqueTitles[title] || 0) + 1;
}

console.log('--- Unique Titles and Counts ---');
const sorted = Object.entries(uniqueTitles).sort((a, b) => b[1] - a[1]);
for (const [title, count] of sorted) {
  console.log(`${title}: ${count}`);
}
