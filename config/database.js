import mongoose from 'mongoose';
import MenuItem from '../models/MenuItem.js';
import Property from '../models/Property.js'; // Import your Property model
import { readFile } from 'fs/promises';

let connected = false;

const connectDB = async () => {
  mongoose.set('strictQuery', true);

  if (connected) return;

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    connected = true;
    console.log('MongoDB Connected...');

    // --- AUTO-SEED MENU ---
    const itemCount = await MenuItem.countDocuments();
    if (itemCount === 0) {
      console.log('Menu is empty. Auto-seeding...');
      const menuData = JSON.parse(
        await readFile(new URL('../menu.json', import.meta.url))
      );
      await MenuItem.insertMany(menuData);
      console.log('Menu auto-seeded! 🍔');
    }

    // --- AUTO-SEED PROPERTIES ---
    const propertyCount = await Property.countDocuments();
    if (propertyCount === 0) {
      console.log('Properties are empty. Auto-seeding...');
      const propertyData = JSON.parse(
        await readFile(new URL('../properties.json', import.meta.url))
      );
      await Property.insertMany(propertyData);
      console.log('Properties auto-seeded! 🏠');
    }

  } catch (error) {
    console.error('Database connection/seeding error:', error);
  }
};

export default connectDB;