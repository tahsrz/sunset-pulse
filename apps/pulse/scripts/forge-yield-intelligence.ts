import fs from 'fs';
import path from 'path';
import { TAHBuilder, TAHInput } from '../lib/core/tah_builder';
import { sessionForge } from '../lib/intelligence/sessionForge';

/**
 * Yield Intelligence Forge
 * Crunches USDA county yield data into a deterministic productivity index.
 * Used as a component of sitewide 'Popularity' and 'Value' intelligence.
 */

interface YieldData {
  county: string;
  fips: string;
  cornYield: number; // BU / ACRE
  wheatYield: number; // BU / ACRE
  latestYear: number;
}

const NORTH_TEXAS_YIELDS: YieldData[] = [
  { county: 'Cooke', fips: '48097', cornYield: 73.7, wheatYield: 55.8, latestYear: 2024 },
  { county: 'Denton', fips: '48121', cornYield: 60.8, wheatYield: 45.0, latestYear: 2024 },
  { county: 'Montague', fips: '48337', cornYield: 26.7, wheatYield: 22.0, latestYear: 2022 },
  { county: 'Wise', fips: '48497', cornYield: 60.0, wheatYield: 20.2, latestYear: 2022 },
  { county: 'Dallas', fips: '48113', cornYield: 85.0, wheatYield: 40.0, latestYear: 2023 },
  { county: 'Tarrant', fips: '48439', cornYield: 80.0, wheatYield: 38.0, latestYear: 2023 },
  { county: 'Grayson', fips: '48181', cornYield: 95.0, wheatYield: 50.0, latestYear: 2024 },
  { county: 'Collin', fips: '48085', cornYield: 90.0, wheatYield: 48.0, latestYear: 2024 }
];

function calculateProductivityScore(yieldData: YieldData): number {
  // Simple weighted index: Corn is 60%, Wheat is 40%
  // Normalized against a "High Productivity" baseline (150 for corn, 80 for wheat)
  const cornScore = (yieldData.cornYield / 150) * 100;
  const wheatScore = (yieldData.wheatYield / 80) * 100;
  return Math.round((cornScore * 0.6) + (wheatScore * 0.4));
}

async function forgeYieldIntelligence() {
  console.log('⚒️ [YIELD_FORGE] Initiating Agricultural Productivity Analysis...');

  const tahInputs: TAHInput[] = [];

  NORTH_TEXAS_YIELDS.forEach(data => {
    const score = calculateProductivityScore(data);
    const intensity = score > 60 ? 'HIGH' : score > 30 ? 'MODERATE' : 'LOW';
    
    console.log(`🌾 [YIELD_FORGE] ${data.county} County: Productivity Score ${score} (${intensity})`);

    tahInputs.push({
      keywords: [data.county.toUpperCase(), 'YIELD', 'PRODUCTIVITY', 'AGRICULTURE', 'FIPS_' + data.fips],
      data: `COUNTY: ${data.county} | FIPS: ${data.fips} | PRODUCTIVITY_SCORE: ${score} | INTENSITY: ${intensity} | CORN_LATEST: ${data.cornYield} BU/AC | WHEAT_LATEST: ${data.wheatYield} BU/AC | YEAR: ${data.latestYear} | INSIGHT: ${data.county} exhibits ${intensity.toLowerCase()} relative agricultural yield compared to the North Texas baseline.`,
      type: 1
    });
  });

  // Save JSON for app logic consumption
  const outputPath = path.join(process.cwd(), 'private/yield_intelligence.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(NORTH_TEXAS_YIELDS, null, 2));
  console.log(`💾 [YIELD_FORGE] JSON data saved to ${outputPath}`);

  // Forge TAH Cartridge
  const builder = new TAHBuilder(0.001, 14);
  const buffer = builder.forge(tahInputs);
  
  const cartridgePath = path.join(process.cwd(), 'cartridges/yield_intel.tah');
  fs.writeFileSync(cartridgePath, buffer);
  console.log(`💾 [YIELD_FORGE] TAH cartridge saved to ${cartridgePath}`);

  // Deploy to session
  console.log('🛡️ [YIELD_FORGE] Syncing with Intelligence Grid...');
  await sessionForge.forgeSessionCartridge('yield_intel', tahInputs);
}

forgeYieldIntelligence().catch(err => {
  console.error('❌ [YIELD_FORGE] Critical Failure:', err);
  process.exit(1);
});
