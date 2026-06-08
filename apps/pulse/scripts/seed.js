// scripts/seed.js
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const connectDB = require('../lib/core/database').default;
const { assertDestructiveDbOperationAllowed } = require('../lib/core/runtimeSafety');
const Property = require('../models/Property').default;
const properties = require('../properties.json');
const axios = require('axios');

const geocodeAddress = async (location) => {
  const { street, city, state, zipcode } = location;
  const address = `${street}, ${city}, ${state} ${zipcode}`;
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_GEOCODING_API_KEY;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;

  try {
    const response = await axios.get(url);
    if (response.data.results && response.data.results.length > 0) {
      const { lat, lng } = response.data.results[0].geometry.location;
      return {
        type: 'Point',
        coordinates: [lng, lat], // MongoDB expects [longitude, latitude]
      };
    }
  } catch (error) {
    console.error(`Geocoding error for ${address}:`, error.message);
  }
  return null;
};

const seedData = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await connectDB();
    
    console.log('Clearing existing properties and leads...');
    assertDestructiveDbOperationAllowed({
      operation: 'Property.deleteMany',
      scope: 'all seeded properties before seed',
    });
    await Property.deleteMany(); 
    try {
      const Lead = require('../models/Lead').default;
      assertDestructiveDbOperationAllowed({
        operation: 'Lead.deleteMany',
        scope: 'all seeded leads before seed',
      });
      await Lead.deleteMany();
      console.log('Leads cleared.');
    } catch (e) {
      console.warn('Lead model not found or clear failed, skipping.');
    }

    console.log('Geocoding and sanitizing properties...');
    const sanitizedProperties = [];
    
    let isFirst = true;
    for (const property of properties) {
      const p = { ...property };
      delete p._id;
      if (isFirst) {
        p._id = "650c8e2b1f4e1a2b3c4d5e6f";
        isFirst = false;
      }
      if (!p.owner || p.owner === "" || p.owner === "1") {
        p.owner = "650c8e2b1f4e1a2b3c4d5e6f"; // Default to valid test user
      }
      p.is_demo = true;

      // Add Geocoding Logic but keep existing coords as fallback
      const geo = await geocodeAddress(p.location);
      if (geo) {
        p.location_geo = geo;
      } else if (!p.location_geo) {
        console.warn(`No geocoding for ${p.name} and no existing location_geo.`);
      }

      sanitizedProperties.push(p);
    }

    console.log('Inserting sanitized properties...');
    await Property.insertMany(sanitizedProperties);
    
    console.log('Success! Data seeded with geocoding.');
    process.exit();
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seedData();
