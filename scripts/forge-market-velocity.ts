import { TAHBuilder, TAHInput } from '../lib/core/tah_builder';
import { calculateMarketVelocity } from '../lib/intelligence/marketVelocity';
import { sessionForge } from '../lib/intelligence/sessionForge';
import fs from 'fs';
import path from 'path';

/**
 * Market Velocity Forge
 * Forges the market_velocity.tah expertise cartridge using simulated maturation logic.
 * This cartridge is used by Jamie AI (Makiel Judge) to provide deterministic market insights.
 */

async function forgeMarketVelocity() {
  console.log('⚒️ [MARKET_FORGE] Initiating Market Velocity Simulation...');

  // 1. Load Property Data to Seed Simulation
  const propertiesPath = path.join(process.cwd(), 'properties.json');
  if (!fs.existsSync(propertiesPath)) {
    console.error('❌ Properties file not found.');
    return;
  }
  
  const properties = JSON.parse(fs.readFileSync(propertiesPath, 'utf8'));
  
  // 2. Group by City
  const cityData: Record<string, any> = {};
  properties.forEach((p: any) => {
    const city = p.location.city;
    if (!cityData[city]) {
      cityData[city] = { count: 0, totalPrice: 0, totalAge: 0 };
    }
    cityData[city].count++;
    cityData[city].totalPrice += (p.rates?.monthly || 2500);
    
    // Simulate age: if createdAt exists, use it, else random 5-60 days
    const age = p.createdAt ? (Date.now() - new Date(p.createdAt).getTime()) / (1000 * 60 * 60 * 24) : (5 + Math.random() * 55);
    cityData[city].totalAge += age;
  });

  // 3. Calculate Velocities and Create TAH Inputs
  const tahInputs: TAHInput[] = [];
  
  for (const city of Object.keys(cityData)) {
    const data = cityData[city];
    const avgPrice = data.totalPrice / data.count;
    const avgAge = data.totalAge / data.count;
    
    const velocity = calculateMarketVelocity(city, data.count, avgPrice, avgAge);
    
    console.log(`📊 [MARKET_FORGE] ${city}: Score ${velocity.velocityScore} (${velocity.trend})`);
    
    tahInputs.push({
      keywords: [city.toUpperCase(), 'MARKET_VELOCITY', 'VELOCITY', 'MAKIEL'],
      data: `CITY: ${city} | VELOCITY: ${velocity.velocityScore} | TREND: ${velocity.trend} | MATURATION: ${velocity.maturationDays} days | RATIONALE: ${velocity.rationale}`,
      type: 1
    });
  }

  // 4. Forge the cartridge buffer
  const builder = new TAHBuilder(0.001, 14);
  const buffer = builder.forge(tahInputs);
  
  // Save locally first (Always succeeds if disk ok)
  const localPath = path.join(process.cwd(), 'cartridges/market_velocity.tah');
  fs.writeFileSync(localPath, buffer);
  console.log(`💾 [MARKET_FORGE] Local copy saved to ${localPath}`);

  // 5. Attempt Cloud Deployment (Ozriel Protocol Audit via SessionForge)
  console.log('🛡️ [MARKET_FORGE] Attempting cloud deployment via SessionForge...');
  await sessionForge.forgeSessionCartridge('market_velocity', tahInputs);
}

forgeMarketVelocity();
