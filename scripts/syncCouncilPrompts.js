require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

// We'll define a simple schema for the sync
const EntitySchema = new mongoose.Schema({
  uid: String,
  logic: {
    systemPrompt: String
  }
}, { collection: 'entities' });

const Entity = mongoose.models.Entity || mongoose.model('Entity', EntitySchema);

// Since I cannot easily require TS files from a plain node script without ts-node,
// I will extract the prompts from the audit I just performed or read the file directly.
// To be safe and efficient, I'll read the prompts file content and parse it.

const fs = require('fs');
const path = require('path');

const promptsPath = path.join(process.cwd(), 'lib/ai/prompts.ts');
const promptsContent = fs.readFileSync(promptsPath, 'utf8');

function extractPrompt(constantName) {
  const regex = new RegExp(`export const ${constantName} = \`([\\s\\S]*?)\`;`, 'm');
  const match = promptsContent.match(regex);
  return match ? match[1].trim() : null;
}

const syncMap = {
  'ENVOY-JAMIE': extractPrompt('JAMIE_SYSTEM_PROMPT'),
  'JUDGE-MAKIEL': extractPrompt('MAKIEL_SYSTEM_PROMPT'),
  'JUDGE-GADRAEL': extractPrompt('GADRAEL_SYSTEM_PROMPT'),
  'JUDGE-ZAKARIEL': extractPrompt('ZAKARIEL_SYSTEM_PROMPT'),
  'JUDGE-DURANDIEL': extractPrompt('DURANDIEL_SYSTEM_PROMPT'),
  'JUDGE-TELARIEL': extractPrompt('TELARIEL_SYSTEM_PROMPT'),
  'JUDGE-REZAEL': extractPrompt('REZAEL_SYSTEM_PROMPT'),
  'JUDGE-PHOENIX': extractPrompt('PHOENIX_SYSTEM_PROMPT'),
  'JUDGE-REAPER': extractPrompt('REAPER_SYSTEM_PROMPT')
};

async function sync() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB.');

    for (const [uid, prompt] of Object.entries(syncMap)) {
      if (prompt) {
        await Entity.updateOne({ uid }, { $set: { 'logic.systemPrompt': prompt } });
        console.log(`Updated ${uid}`);
      } else {
        console.warn(`Could not find prompt for ${uid}`);
      }
    }

    console.log('Council Registry Synchronized.');
    process.exit(0);
  } catch (err) {
    console.error('Sync failed:', err);
    process.exit(1);
  }
}

sync();
