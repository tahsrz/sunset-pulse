import mongoose from 'mongoose';
const { Schema, model, models } = mongoose;

const LeadSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
    },
    phone: {
      type: String,
    },
    property: {
      type: Schema.Types.ObjectId,
      ref: 'Property',
      required: true,
    },
    budget: {
      type: Number,
      default: 0,
    },
    timeframe: {
      type: String,
      enum: ['immediate', '1-3 months', '3-6 months', '6+ months', 'unknown'],
      default: 'unknown',
    },
    source: {
      type: String,
      default: 'organic',
    },
    lastActivity: {
      type: Date,
      default: Date.now,
    },
    engagementVelocity: {
      type: Number,
      default: 0,
    },
    reengagementHook: {
      type: Schema.Types.Mixed,
    },
    tags: [
      {
        type: String,
      },
    ],
    idxViewed: {
      type: Boolean,
      default: false,
    },
    views: {
      type: Number,
      default: 0,
    },
    chatMinutes: {
      type: Number,
      default: 0,
    },
    tourRequested: {
      type: Boolean,
      default: false,
    },
    jamieNotes: {
      type: String,
    },
    probability: {
      type: Number,
      default: 50,
    },
    status: {
      type: String,
      enum: ['new', 'contacted', 'closed', 'lost'],
      default: 'new',
    },
    leadCategory: {
      type: String,
      enum: ['Residential', 'RV'],
      default: 'Residential',
    },
    marketingConsent: {
      type: Boolean,
      default: false
    },
    crossPlatformConsent: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
  }
);

const Lead = models.Lead || model('Lead', LeadSchema);

export default Lead;
