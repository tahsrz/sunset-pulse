import mongoose from 'mongoose';

const VibeTermRelationshipSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, default: 'default' },
  vibeId: { type: String, required: true, trim: true },
  termId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'VibeTerm' },
  assignedBy: { type: String, required: true, trim: true },
}, { timestamps: true });

VibeTermRelationshipSchema.index({ tenantId: 1, vibeId: 1, termId: 1 }, { unique: true });
VibeTermRelationshipSchema.index({ tenantId: 1, termId: 1, vibeId: 1 });

const VibeTermRelationship = mongoose.models.VibeTermRelationship || mongoose.model('VibeTermRelationship', VibeTermRelationshipSchema);
export default VibeTermRelationship;
