import mongoose from 'mongoose';
const { Schema, model, models } = mongoose;

/**
 * Vibe Model - The "Vibe Dictionary" for Semantic Mapping
 * Defines the "World" logic extracted from videos.
 */
const VibeSchema = new Schema(
  {
    vibeId: { type: String, required: true, unique: true }, // e.g., 'vibe-noir-tactical'
    name: { type: String, required: true },
    description: { type: String },
    
    // Linguistic logic extracted from the video's "soul"
    linguisticLogic: {
      tone: String,      // 'cynical', 'hopeful', 'aggressive'
      pacing: String,    // 'staccato', 'flowing', 'erratic'
      vocabulary: [String] // Key words that trigger this vibe
    },
    
    // Visual parameters for the TacticalCloth or R3F components
    visualParameters: {
      meshColor: String,
      bloomIntensity: Number,
      glitchFrequency: Number,
      particleDensity: Number
    },

    // Reference to the source video used for extraction
    sourceVideoPath: String,
    
    metadata: {
      type: Map,
      of: String
    }
  },
  { timestamps: true }
);

const Vibe = models.Vibe || model('Vibe', VibeSchema);
export default Vibe;
