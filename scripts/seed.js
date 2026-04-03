// scripts/seed.js
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const connectDB = require('../config/database').default;
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
    
    console.log('Clearing existing properties...');
    await Property.deleteMany(); 

    console.log('Geocoding and sanitizing properties...');
    const sanitizedProperties = [];
    
    for (const property of properties) {
      const p = { ...property };
      delete p._id;
      if (p.owner === "" || p.owner === "1") delete p.owner;

      // Add Geocoding Logic
      const geo = await geocodeAddress(p.location);
      if (geo) {
        p.location_geo = geo;
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
