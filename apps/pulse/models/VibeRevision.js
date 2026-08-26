import mongoose from 'mongoose';

const VibeRevisionSchema = new mongoose.Schema({
  vibeId: { type: String, required: true, index: true },
  tenantId: { type: String, required: true, index: true },
  revisionNumber: { type: Number, required: true },
  snapshot: { type: mongoose.Schema.Types.Mixed, required: true },
  cssVars: { type: mongoose.Schema.Types.Mixed, default: {} },
  voiceConfig: { type: mongoose.Schema.Types.Mixed, default: {} },
  validationReport: { type: mongoose.Schema.Types.Mixed, default: {} },
  schemaVersion: { type: Number, default: 1 },
  contentHash: { type: String, required: true },
  parentRevisionId: { type: String },
  changeSummary: { type: String, default: '' },
  createdBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  publishedAt: { type: Date },
  publishedBy: { type: String },
}, { timestamps: false });

VibeRevisionSchema.index({ vibeId: 1, revisionNumber: -1 }, { unique: true });
VibeRevisionSchema.index({ _id: 1, tenantId: 1 });

const VibeRevision = mongoose.models.VibeRevision || mongoose.model('VibeRevision', VibeRevisionSchema);
export default VibeRevision;
