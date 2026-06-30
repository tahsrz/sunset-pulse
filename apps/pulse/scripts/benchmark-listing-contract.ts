import { performance } from 'node:perf_hooks';
import { normalizeListing } from '../lib/data/listingContract';

const count = Math.max(1, Number(process.argv[2] || 50_000));
const startedAt = performance.now();
let checksum = 0;

for (let index = 0; index < count; index += 1) {
  const listing = normalizeListing({
    id: `benchmark-${index}`,
    mls_id: `NTREIS-${index}`,
    name: `${index} Benchmark Lane`,
    city: index % 2 === 0 ? 'Dallas' : 'Fort Worth',
    state: 'TX',
    latitude: 32.7 + (index % 100) / 1_000,
    longitude: -97.3 + (index % 100) / 1_000,
    beds: 3,
    baths: 2,
    sqft: 1_800,
    price: 425_000 + index,
    images: '["https://example.test/listing.jpg"]',
    amenities: '["Garage","Patio"]',
    display_public: 1,
    is_demo: 0,
  });
  checksum += listing.images.length + (listing.beds || 0);
}

const durationMs = performance.now() - startedAt;
console.log(JSON.stringify({
  listings: count,
  durationMs: Math.round(durationMs * 100) / 100,
  listingsPerSecond: Math.round(count / (durationMs / 1_000)),
  checksum,
}));
