import './load-env.js';
import mongoose from 'mongoose';
import { createClient } from '@supabase/supabase-js';
import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

import connectDB from '../lib/core/database.js';
import MenuItem from '../models/MenuItem.js';
import Story from '../models/Story.js';
import Vibe from '../models/Vibe.js';
import Coupon from '../models/Coupon.js';
// We'll import Property dynamically or as needed to avoid issues if models aren't fully ready
import Property from '../models/Property.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// --- 1. Supabase Seeds ---

async function seedLeads() {
  if (!supabaseUrl || !supabaseKey) return console.warn('⚠️ Supabase credentials missing, skipping leads seed.');
  const supabase = createClient(supabaseUrl, supabaseKey);
  console.log('🌱 [SEED:LEADS] Planting Mock Leads...');
  const mockLeads = [
    { name: 'John Austin', email: 'john@austin.com', metadata: { location_interest: 'Austin', lead_category: 'Residential' }, stage: 'New', probability: 45 },
    { name: 'Sarah Dallas', email: 'sarah@dallas.com', metadata: { location_interest: 'Dallas', lead_category: 'Commercial' }, stage: 'New', probability: 60 },
    { name: 'Houston Tex', email: 'houston@gmail.com', metadata: { location_interest: 'Houston', lead_category: 'RV' }, stage: 'New', probability: 30 },
    { name: 'Fort Worthy', email: 'worth@me.com', metadata: { location_interest: 'Fort Worth', lead_category: 'Residential' }, stage: 'New', probability: 55 },
    { name: 'San Antone', email: 'san@antonio.org', metadata: { location_interest: 'San Antonio', lead_category: 'Commercial' }, stage: 'New', probability: 75 }
  ];
  const { error } = await supabase.from('leads').upsert(mockLeads, { onConflict: 'email' });
  if (error) console.error('❌ [SEED:LEADS] Failed:', error.message);
  else console.log('✅ [SEED:LEADS] Success.');
}

async function seedScythe() {
  if (!supabaseUrl || !supabaseKey) return;
  const supabase = createClient(supabaseUrl, supabaseKey);
  console.log('🌱 [SEED:SCYTHE] Seeding Scythe Registry...');
  const registryPath = path.resolve(__dirname, '../utils/jamie/memory/scythe_registry.json');
  const registry = JSON.parse(await readFile(registryPath, 'utf8'));
  const { data: existing } = await supabase.from('scythe_registry').select('original');
  const existingPatterns = new Set(existing?.map(e => e.original) || []);
  const newEntries = registry.filter(entry => !existingPatterns.has(entry.original));
  if (newEntries.length > 0) {
    const { error } = await supabase.from('scythe_registry').insert(newEntries);
    if (error) console.error('❌ [SEED:SCYTHE] Failed:', error.message);
    else console.log(`✅ [SEED:SCYTHE] Added ${newEntries.length} entries.`);
  } else {
    console.log('✅ [SEED:SCYTHE] Registry up to date.');
  }
}

// --- 2. MongoDB Seeds ---

async function seedMenu() {
  console.log('🌱 [SEED:MENU] Syncing Menu Catalog...');
  const menuPath = path.resolve(__dirname, '../menu.json');
  const menuData = JSON.parse(await readFile(menuPath, 'utf8'));
  for (const item of menuData) {
    await MenuItem.findOneAndUpdate(
      { agentId: item.agentId || 'taz-realty-001', id: item.id },
      { $set: item },
      { upsert: true }
    );
  }
  console.log('✅ [SEED:MENU] Menu synced.');
}

async function seedStories() {
  console.log('🌱 [SEED:STORIES] Initializing Tactical Stories...');
  const stories = [
    {
      uid: 'CATERPILLAR-01',
      title: 'The Very Hungry Operative',
      author: 'Eric Carle (Tactical Adaption)',
      pages: [
        { pageNumber: 1, originalText: 'In the light of the moon, a little egg lay on a leaf.', metadata: { vibe: 'peaceful' } },
        { pageNumber: 2, originalText: 'One Sunday morning the warm sun came up and - pop! - out of the egg came a tiny and very hungry caterpillar.', metadata: { vibe: 'intense' } },
        { pageNumber: 3, originalText: 'He started to look for some food.', metadata: { vibe: 'hungry' } }
      ]
    }
  ];
  for (const story of stories) {
    await Story.findOneAndUpdate({ uid: story.uid }, story, { upsert: true });
  }
  console.log('✅ [SEED:STORIES] Stories seeded.');
}

async function seedVibes() {
  console.log('🌱 [SEED:VIBES] Initializing Vibe Dictionary...');
  const vibes = [
    { vibeId: 'vibe-noir-spike', name: 'Noir Tactical (Spike Spiegel)', description: 'A world of cigarette smoke, jazz, and nonchalant high-stakes operations.' },
    { vibeId: 'vibe-emerald-matrix', name: 'Emerald Intelligence (Jamie)', description: 'A crisp, high-fidelity digital realm focused on strategic asset management.' }
  ];
  for (const vibe of vibes) {
    await Vibe.findOneAndUpdate({ vibeId: vibe.vibeId }, vibe, { upsert: true });
  }
  console.log('✅ [SEED:VIBES] Vibes initialized.');
}

async function seedCoupons() {
  console.log('🌱 [SEED:COUPONS] Planting Promotional Codes...');
  const coupons = [
    {
      code: 'FIRST10',
      label: 'Welcome 10% Off',
      description: '10% off your first online order!',
      type: 'percent',
      percentOff: 10,
      firstOrderOnly: true,
      maxDiscount: 10
    },
    {
      code: 'BASKET10',
      label: 'Basket 10% Off',
      description: 'Take 10% off your order.',
      type: 'percent',
      percentOff: 10,
      maxDiscount: 5
    },
    {
      code: 'FREEDRINK',
      label: 'Free Drink',
      description: 'Free fountain drink at pickup.',
      type: 'free_item',
      freeItemName: 'Fountain drink'
    }
  ];
  for (const coupon of coupons) {
    await Coupon.findOneAndUpdate({ code: coupon.code }, coupon, { upsert: true });
  }
  console.log('✅ [SEED:COUPONS] Coupons seeded.');
}

async function seedProperties() {
  console.log('🌱 [SEED:PROPERTIES] Seeding Real Estate Listings...');
  const propertiesPath = path.resolve(__dirname, '../properties.json');
  const properties = JSON.parse(await readFile(propertiesPath, 'utf8'));
  for (const p of properties) {
    const data = { ...p, is_demo: true };
    delete data._id;
    await Property.findOneAndUpdate({ name: p.name }, data, { upsert: true });
  }
  console.log('✅ [SEED:PROPERTIES] Properties seeded.');
}

// --- 3. Prisma Seed (Postgres) ---

async function seedRoster() {
  console.log('🌱 [SEED:ROSTER] Syncing Grill Shift Roster...');
  try {
    const { prisma } = await import('@calcom/prisma');
    // We'll just run a minimal version of the roster seed here or trigger the existing script
    // To keep this clean, let's just trigger the existing roster seed script via child_process
    // since Prisma setup in a monorepo can be tricky with direct imports
    const { execSync } = await import('child_process');
    execSync('npx tsx scripts/seed-roster.ts', { stdio: 'inherit' });
    console.log('✅ [SEED:ROSTER] Roster sync complete.');
  } catch (e) {
    console.warn('⚠️ [SEED:ROSTER] Prisma/Roster seed failed. Check your Cal.com Postgres connection.');
  }
}

// --- Main Dispatcher ---

const SEEDS = {
  leads: seedLeads,
  scythe: seedScythe,
  menu: seedMenu,
  stories: seedStories,
  vibes: seedVibes,
  coupons: seedCoupons,
  properties: seedProperties,
  roster: seedRoster,
};

async function main() {
  const target = process.argv[2];

  if (target && target !== 'all') {
    if (SEEDS[target]) {
      await connectDB();
      await SEEDS[target]();
    } else {
      console.error(`❌ Unknown seed target: ${target}. Available: ${Object.keys(SEEDS).join(', ')} or 'all'`);
      process.exit(1);
    }
  } else {
    console.log('🚀 Running Full Project Seed (All Domains)...');
    await connectDB();
    for (const [name, fn] of Object.entries(SEEDS)) {
      try {
        await fn();
      } catch (err) {
        console.error(`❌ [${name.toUpperCase()}] failed:`, err.message);
      }
    }
  }
}

main()
  .catch((err) => {
    console.error('❌ Seed dispatcher crashed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
