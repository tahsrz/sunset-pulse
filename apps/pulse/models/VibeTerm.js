import mongoose from 'mongoose';

const VibeTermSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, default: 'default' },
  taxonomyId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'VibeTaxonomy' },
  slug: { type: String, required: true, lowercase: true, trim: true },
  label: { type: String, required: true, trim: true },
  description: { type: String, default: '', trim: true },
  parentTermId: { type: mongoose.Schema.Types.ObjectId, ref: 'VibeTerm' },
  legacyId: { type: String, trim: true },
  status: { type: String, enum: ['active', 'archived'], default: 'active' },
}, { timestamps: true });

VibeTermSchema.index({ tenantId: 1, taxonomyId: 1, slug: 1 }, { unique: true });
VibeTermSchema.index({ tenantId: 1, legacyId: 1 }, { unique: true, sparse: true });

const VibeTerm = mongoose.models.VibeTerm || mongoose.model('VibeTerm', VibeTermSchema);
export default VibeTerm;
