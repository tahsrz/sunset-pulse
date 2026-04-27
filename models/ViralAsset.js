import mongoose from 'mongoose';
const { Schema, model, models } = mongoose;

const ViralAssetSchema = new Schema(
  {
    name: { type: String, required: true },
    type: { type: String, enum: ['STICKER', 'BACKGROUND'], required: true },
    path: { type: String, required: true }, // Local or Public path
    metadata: {
      characterId: String, // For STICKER (e.g., 'ENVOY-GHOST')
      location: String,    // For BACKGROUND (e.g., 'Sunset, TX')
      vibe: [String],      // ['Tactical', 'Rough', 'Gourmet']
    },
    usageCount: { type: Number, default: 0 }
  },
  { timestamps: true }
);

const ViralAsset = models.ViralAsset || model('ViralAsset', ViralAssetSchema);
export default ViralAsset;
