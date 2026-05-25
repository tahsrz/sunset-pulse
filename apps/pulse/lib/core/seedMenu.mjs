import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

import connectDB from './database.js';
import MenuItem from '../../models/MenuItem.js';
import { readFile } from 'fs/promises';

const seedMenu = async () => {
  try {
    await connectDB();
    const menuData = JSON.parse(
      await readFile(new URL('../../menu.json', import.meta.url))
    );
    await MenuItem.deleteMany();
    await MenuItem.insertMany(menuData);
    console.log('Menu Seeded Successfully! 🍔');
    process.exit();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

seedMenu();