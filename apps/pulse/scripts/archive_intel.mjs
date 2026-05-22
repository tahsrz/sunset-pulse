import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

// Config
const MONGODB_URI = process.env.MONGODB_URI;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EXPORT_DIR = './exports';

async function archiveIntel() {
  console.log('📦 [ARCHIVE] Initiating local intelligence harvest...');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  try {
    // 1. Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    const db = mongoose.connection;

    // --- Archive Vibes ---
    console.log('📡 [ARCHIVE] Harvesting Vibe Dictionary...');
    const Vibes = db.model('Vibe', new mongoose.Schema({}, { strict: false }));
    const vibes = await Vibes.find({}).lean();
    fs.writeFileSync(
      path.join(EXPORT_DIR, `vibes/vibe_dictionary_backup_${timestamp}.json`),
      JSON.stringify(vibes, null, 2)
    );

    // --- Archive Stories ---
    console.log('📡 [ARCHIVE] Harvesting Narrative Documents...');
    const Stories = db.model('Story', new mongoose.Schema({}, { strict: false }));
    const stories = await Stories.find({}).lean();
    stories.forEach(story => {
      fs.writeFileSync(
        path.join(EXPORT_DIR, `stories/story_${story.uid}_${timestamp}.json`),
        JSON.stringify(story, null, 2)
      );
    });

    // 2. Connect to Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    // --- Archive Briefings ---
    console.log('📡 [ARCHIVE] Harvesting Regional Briefings...');
    const { data: briefings } = await supabase.from('daily_briefings').select('*');
    if (briefings) {
      fs.writeFileSync(
        path.join(EXPORT_DIR, `briefings/briefings_archive_${timestamp}.json`),
        JSON.stringify(briefings, null, 2)
      );
    }

    console.log(`✅ [ARCHIVE] Success. Intel physicalized to ${path.resolve(EXPORT_DIR)}`);
    process.exit(0);
  } catch (error) {
    console.error('❌ [ARCHIVE] Harvest failed:', error);
    process.exit(1);
  }
}

archiveIntel();
