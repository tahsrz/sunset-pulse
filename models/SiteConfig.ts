import mongoose from 'mongoose';

const SiteConfigSchema = new mongoose.Schema({
  agentId: { type: String, required: true, unique: true },
  branding: {
    primaryColor: { type: String, default: '#2563eb' }, // Default Blue
    fontFamily: { type: String, default: 'Inter' },
    siteName: { type: String, default: 'Sunset Pulse Realty' },
  },
  hero: {
    title: { type: String, default: 'Find Your Future Home' },
    subtitle: { type: String, default: 'Powered by Jamie AI' },
    backgroundImage: { type: String },
  },
  sections: [{
    type: { type: String }, // e.g., 'listings', 'contact', 'about'
    visible: { type: Boolean, default: true },
    order: { type: Number }
  }],
  lastModifiedBy: { type: String, default: 'Jamie' }
});

export const SiteConfig = mongoose.models.SiteConfig || mongoose.model('SiteConfig', SiteConfigSchema);