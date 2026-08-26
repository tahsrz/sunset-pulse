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
    title: { type: String },
    slug: { type: String, lowercase: true, trim: true },
    tenantId: { type: String, default: 'default' },
    status: { type: String, enum: ['draft', 'in_review', 'published', 'archived', 'trash'], default: 'draft' },
    authorId: { type: String },
    updatedBy: { type: String },
    publishedBy: { type: String },
    publishedRevisionId: { type: String },
    submittedRevisionId: { type: String },
    currentDraftVersion: { type: Number, default: 0 },
    excerpt: { type: String, default: '' },
    longDescription: { type: String, default: '' },
    taxonomyTermIds: { type: [String], default: [] },
    source: { type: mongoose.Schema.Types.Mixed, default: {} },
    migrationMetadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    archivedAt: { type: Date },
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

VibeSchema.index({ tenantId: 1, status: 1 });
VibeSchema.index({ slug: 1, tenantId: 1 }, { unique: true, sparse: true });

/** @type {import('mongoose').Model<any>} */
const Vibe = models.Vibe || model('Vibe', VibeSchema);
export default Vibe;
