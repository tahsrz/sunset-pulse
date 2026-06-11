import './load-env.js';
import mongoose from 'mongoose';
import connectDB from '../lib/core/database.js';
import MenuItem from '../models/MenuItem.js';

async function main() {
  await connectDB();
  const items = await MenuItem.find({}).sort({ id: 1 }).lean();
  console.log(`Found ${items.length} items in MenuItem collection:`);
  items.forEach(i => {
    console.log(`- [${i.id}] ${i.name} (_id: ${i._id})`);
  });
}

main()
  .catch(console.error)
  .finally(() => mongoose.disconnect());
