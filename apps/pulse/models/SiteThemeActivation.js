import mongoose from 'mongoose';

const SiteThemeActivationSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, default: 'default' },
  siteId: { type: String, required: true, trim: true },
  themeId: { type: String, required: true, trim: true },
  version: { type: String, required: true, trim: true },
  activatedAt: { type: Date, required: true },
  activatedBy: { type: String, required: true },
}, { timestamps: true });

SiteThemeActivationSchema.index({ tenantId: 1, siteId: 1 }, { unique: true });
SiteThemeActivationSchema.index({ tenantId: 1, themeId: 1 });

const SiteThemeActivation = mongoose.models.SiteThemeActivation || mongoose.model('SiteThemeActivation', SiteThemeActivationSchema);
export default SiteThemeActivation;

