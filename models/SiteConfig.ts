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
  jamieSystemPrompt: { type: String },
  abidanPrompts: {
    MARKET_SCOUT: { type: String },
    ASSET_ANALYST: { type: String },
    MAKIEL: { type: String },
    GADRAEL: { type: String },
    DURANDIEL: { type: String },
    TELARIEL: { type: String },
    REZAEL: { type: String },
    ZAKARIEL: { type: String },
    PHOENIX: { type: String },
    REAPER: { type: String }
  },
  modelMatrix: {
    primaryModel: { type: String, default: 'llama-3.1-8b-instant' },
    reconModel: { type: String, default: 'meta-llama/llama-3.1-405b-instruct:free' },
    miniModel: { type: String, default: 'google/gemma-2-9b-it:free' }
  },
  operationalSettings: {
    minJudges: { type: Number, default: 1 },
    maxJudges: { type: Number, default: 4 },
    personalityPreset: { type: String, enum: ['Aggressive', 'Supportive', 'Mysterious', 'Custom'], default: 'Aggressive' }
  },
  lastModifiedBy: { type: String, default: 'Jamie' }
});

export const SiteConfig = mongoose.models.SiteConfig || mongoose.model('SiteConfig', SiteConfigSchema);
