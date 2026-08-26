import mongoose from 'mongoose';
const VibeAuditEventSchema = new mongoose.Schema({
  vibeId: { type: String, required: true, index: true }, tenantId: { type: String, required: true, index: true },
  action: { type: String, enum: ['created', 'submitted', 'rejected', 'published', 'applied', 'archived', 'trashed', 'restored', 'rolled_back'], required: true },
  revisionId: { type: String }, siteId: { type: String }, actorId: { type: String, required: true }, reason: { type: String, default: '' }, occurredAt: { type: Date, default: Date.now },
}, { timestamps: false });
VibeAuditEventSchema.index({ vibeId: 1, occurredAt: -1 });
VibeAuditEventSchema.index({ tenantId: 1, occurredAt: -1 });
const VibeAuditEvent = mongoose.models.VibeAuditEvent || mongoose.model('VibeAuditEvent', VibeAuditEventSchema);
export default VibeAuditEvent;
