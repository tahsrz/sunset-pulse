require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

const EntitySchema = new mongoose.Schema({
  uid: String,
  logic: {
    modelId: String
  }
}, { collection: 'entities' });

const Entity = mongoose.models.Entity || mongoose.model('Entity', EntitySchema);

async function updateModels() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB.');

    const result = await Entity.updateMany(
      { uid: /^JUDGE-/ }, 
      { $set: { 'logic.modelId': 'meta-llama/llama-3.3-70b-instruct' } }
    );

    console.log(`Updated ${result.modifiedCount} Council models to Llama-3.3-70B.`);
    process.exit(0);
  } catch (err) {
    console.error('Update failed:', err);
    process.exit(1);
  }
}

updateModels();
