// scripts/seed.js
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const connectDB = require('../config/database').default;
const Property = require('../models/Property').default;
const properties = require('../properties.json');

const seedData = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await connectDB();
    
    console.log('Clearing existing properties...');
    await Property.deleteMany(); 

    // This part is crucial: it cleans the JSON data
    const sanitizedProperties = properties.map((property) => {
      // Create a shallow copy so we don't mutate the original JSON
      const p = { ...property };

      // Completely remove the _id if it exists, especially if it's "" or "1"
      delete p._id;

      // Also clean the owner field if it's a placeholder
      if (p.owner === "" || p.owner === "1") {
        delete p.owner;
      }

      return p;
    });

    console.log('Inserting sanitized properties...');
    await Property.insertMany(sanitizedProperties);
    
    console.log('Success! Data seeded without ID errors.');
    process.exit();
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seedData();