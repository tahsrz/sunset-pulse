import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  _id: { type: String, default: 'main' },
  tenantId: { type: String, required: true },
  siteId: { type: String, required: true },
  pageId: { type: String, required: true },
  enabled: { type: Boolean, default: false },
  publishedRevisionId: { type: String },
  version: { type: Number, default: 0 },
  updatedBy: { type: String, required: true },
}, { timestamps: true });

export default mongoose.models.CmsPlatformHomepage || mongoose.model('CmsPlatformHomepage', schema);
