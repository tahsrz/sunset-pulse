import mongoose from 'mongoose';

const CmsPageRevisionSchema = new mongoose.Schema({
  tenantId: { type: String, required: true },
  siteId: { type: String, required: true },
  pageId: { type: String, required: true },
  revisionNumber: { type: Number, required: true, immutable: true },
  snapshot: { type: mongoose.Schema.Types.Mixed, required: true, immutable: true },
  schemaVersion: { type: Number, required: true, default: 1, immutable: true },
  contentHash: { type: String, required: true, immutable: true },
  parentRevisionId: { type: String, immutable: true },
  changeSummary: { type: String, default: '', immutable: true },
  createdBy: { type: String, required: true, immutable: true },
  createdAt: { type: Date, default: Date.now, immutable: true },
  publishedAt: { type: Date, immutable: true },
  publishedBy: { type: String, immutable: true },
}, { timestamps: false });

CmsPageRevisionSchema.index({ tenantId: 1, pageId: 1, revisionNumber: -1 }, { unique: true });
CmsPageRevisionSchema.index({ tenantId: 1, siteId: 1, pageId: 1, createdAt: -1 });

const CmsPageRevision = mongoose.models.CmsPageRevision || mongoose.model('CmsPageRevision', CmsPageRevisionSchema);
export default CmsPageRevision;

