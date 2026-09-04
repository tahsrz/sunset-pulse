import mongoose from 'mongoose';

const SitePluginActivationSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, default: 'default' },
  siteId: { type: String, required: true, trim: true },
  pluginId: { type: String, required: true, trim: true },
  version: { type: String, required: true, trim: true },
  status: { type: String, enum: ['active', 'inactive'], default: 'inactive' },
  settingsSchemaVersion: { type: Number, required: true, default: 1 },
  settings: { type: mongoose.Schema.Types.Mixed, default: {} },
  activatedAt: { type: Date },
  activatedBy: { type: String },
}, { timestamps: true });

SitePluginActivationSchema.index({ tenantId: 1, siteId: 1, pluginId: 1 }, { unique: true });
SitePluginActivationSchema.index({ tenantId: 1, siteId: 1, status: 1 });

const SitePluginActivation = mongoose.models.SitePluginActivation || mongoose.model('SitePluginActivation', SitePluginActivationSchema);
export default SitePluginActivation;

