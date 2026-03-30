import mongoose from 'mongoose';
import MenuItem from '../models/MenuItem.js';
import Property from '../models/Property.js';
import { readFile } from 'fs/promises';

let connected = false;

const connectDB = async () => {
  mongoose.set('strictQuery', true);

  // If the database is already connected, don't connect again
  if (mongoose.connection.readyState === 1) {
    connected = true;
    return;
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    connected = true;
    console.log('MongoDB Connected...');

    // --- AUTO-SEED MENU ---
    const itemCount = await MenuItem.countDocuments();
    if (itemCount === 0) {
      console.log('Menu is empty. Auto-seeding...');
      try {
        const menuData = JSON.parse(
          await readFile(new URL('../menu.json', import.meta.url))
        );
        await MenuItem.insertMany(menuData);
        console.log('Menu auto-seeded! 🍔');
      } catch (seedError) {
        console.error('Menu seeding failed:', seedError);
      }
    }

    // --- AUTO-SEED PROPERTIES ---
    const propertyCount = await Property.countDocuments();
    if (propertyCount === 0) {
      console.log('Properties are empty. Auto-seeding...');
      try {
        const propertyData = JSON.parse(
          await readFile(new URL('../properties.json', import.meta.url))
        );
        await Property.insertMany(propertyData);
        console.log('Properties auto-seeded! 🏠');
      } catch (seedError) {
        console.error('Properties seeding failed:', seedError);
      }
    }

  } catch (error) {
    console.error('Database connection error:', error);
    throw new Error('Database connection failed');
  }
};

export default connectDB;
