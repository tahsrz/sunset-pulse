import 'dotenv/config';
import connectDB from '../config/database.js';
import MenuItem from '../models/MenuItem.js';
import { readFile } from 'fs/promises';

const seedMenu = async () => {
  try {
    await connectDB();
    const menuData = JSON.parse(
      await readFile(new URL('../menu.json', import.meta.url))
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