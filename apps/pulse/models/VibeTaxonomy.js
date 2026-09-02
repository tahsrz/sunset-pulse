import mongoose from 'mongoose';

const VibeTaxonomySchema = new mongoose.Schema({
  tenantId: { type: String, required: true, default: 'default' },
  slug: { type: String, required: true, lowercase: true, trim: true },
  label: { type: String, required: true, trim: true },
  hierarchical: { type: Boolean, default: false },
  status: { type: String, enum: ['active', 'archived'], default: 'active' },
}, { timestamps: true });

VibeTaxonomySchema.index({ tenantId: 1, slug: 1 }, { unique: true });

const VibeTaxonomy = mongoose.models.VibeTaxonomy || mongoose.model('VibeTaxonomy', VibeTaxonomySchema);
export default VibeTaxonomy;
