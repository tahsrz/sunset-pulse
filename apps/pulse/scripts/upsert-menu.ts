import './load-env.js';

import mongoose from 'mongoose';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';

import connectDB from '../lib/core/database.js';
import MenuItem from '../models/MenuItem.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function upsertItem(itemData) {
  const item = await MenuItem.findOneAndUpdate(
    { agentId: itemData.agentId || 'taz-realty-001', id: itemData.id },
    { $set: itemData },
    { new: true, setDefaultsOnInsert: true, upsert: true }
  ).lean();

  console.log(
    `Upserted menu item: ${item.name} (${item.id}) - staffPick=${item.isStaffPick}`
  );
}

async function main() {
  await connectDB();

  const menuPath = path.resolve(__dirname, '../menu.json');
  const menuData = JSON.parse(await readFile(menuPath, 'utf8'));

  const targetId = process.argv[2];

  if (targetId) {
    const item = menuData.find((i) => i.id === targetId);
    if (!item) {
      console.error(`Item with ID ${targetId} not found in menu.json`);
      process.exit(1);
    }
    await upsertItem(item);
  } else {
    console.log('Upserting all menu items from menu.json...');
    for (const item of menuData) {
      await upsertItem(item);
    }
  }
}

main()
  .catch((error) => {
    console.error('Failed to upsert menu items:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
