import mongoose from 'mongoose';
const { Schema, model, models } = mongoose;

const ViralAssetSchema = new Schema(
  {
    name: { type: String, required: true },
    type: { type: String, enum: ['STICKER', 'BACKGROUND', 'VIDEO'], required: true, default: 'VIDEO' },
    path: { type: String, required: true }, 
    sourceUrl: { type: String },
    vibe: { type: String },
    autoMask: {
      maskRadius: { type: Number, default: 80 },
      maskFeather: { type: Number, default: 20 },
      scale: { type: Number, default: 1 },
      brightness: { type: Number, default: 110 },
      x: { type: Number, default: 0 },
      y: { type: Number, default: 0 }
    },
    metadata: {
      characterId: String,
      location: String,
      tags: [String],
    },
    usageCount: { type: Number, default: 0 }
  },
  { timestamps: true }
);

const ViralAsset = models.ViralAsset || model('ViralAsset', ViralAssetSchema);
export default ViralAsset;
