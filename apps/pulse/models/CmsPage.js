import mongoose from 'mongoose';

const CmsPageSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, default: 'default' },
  siteId: { type: String, required: true, trim: true },
  pageId: { type: String, required: true, trim: true },
  title: { type: String, required: true, trim: true },
  slug: { type: String, required: true, lowercase: true, trim: true },
  parentPageId: { type: String, trim: true },
  routePath: { type: String, lowercase: true, trim: true, maxlength: 500 },
  status: { type: String, enum: ['draft', 'published', 'trash'], default: 'draft' },
  authorId: { type: String, required: true },
  updatedBy: { type: String, required: true },
  currentDraftVersion: { type: Number, default: 0 },
  draftPayload: { type: mongoose.Schema.Types.Mixed, required: true },
  publishedRevisionId: { type: String },
  trashedAt: { type: Date },
}, { timestamps: true });

CmsPageSchema.index({ tenantId: 1, pageId: 1 }, { unique: true });
CmsPageSchema.index({ tenantId: 1, siteId: 1, routePath: 1 }, { unique: true, sparse: true });
CmsPageSchema.index({ tenantId: 1, siteId: 1, parentPageId: 1, slug: 1 });
CmsPageSchema.index({ tenantId: 1, siteId: 1, status: 1, updatedAt: -1 });

const CmsPage = mongoose.models.CmsPage || mongoose.model('CmsPage', CmsPageSchema);
export default CmsPage;
