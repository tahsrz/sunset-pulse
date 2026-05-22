import connectDB from '../lib/core/database.js';
import Property from '../models/Property.js';
import dotenv from 'dotenv';
dotenv.config();

async function checkMongo() {
  await connectDB();
  const count = await Property.countDocuments();
  console.log(`✅ [MONGO_AUDIT] Found ${count} properties in MongoDB.`);
  process.exit();
}

checkMongo();
