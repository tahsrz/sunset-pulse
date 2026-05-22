import mongoose from 'mongoose';
import type { Model } from 'mongoose';

const SiteConfigSchema = new mongoose.Schema({
  agentId: { type: String, required: true, unique: true },
  ownerId: { type: String },
  ownerName: { type: String },
  subdomain: {
    type: String,
    lowercase: true,
    trim: true,
    unique: true,
    sparse: true,
    match: /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/
  },
  customDomain: {
    type: String,
    lowercase: true,
    trim: true,
    unique: true,
    sparse: true
  },
  status: {
    type: String,
    enum: ['active', 'draft', 'suspended'],
    default: 'draft'
  },
  subscriptionTier: {
    type: String,
    enum: ['starter', 'site', 'atlas', 'enterprise'],
    default: 'site'
  },
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
  intelligence: {
    grill: {
      name: { type: String, default: 'Sunset Gas & Grill' },
      tagline: { type: String, default: 'Quality Meat • Friendly Service' },
      coordinates: { type: [Number], default: [-97.766724, 33.453823] }, // [lng, lat]
      address: { type: String, default: '101 S. Council, Sunset, TX 76270' },
      mapUrl: { type: String }
    }
  },
  sections: [{
    type: { type: String }, // e.g., 'listings', 'contact', 'about'
    visible: { type: Boolean, default: true },
    order: { type: Number }
  }],
  jamieSystemPrompt: { type: String },
  activeEnvoyId: { type: String, default: 'ENVOY-JAMIE' },
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

export const SiteConfig: Model<any> = mongoose.models.SiteConfig || mongoose.model('SiteConfig', SiteConfigSchema);
