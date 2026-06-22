import { Schema, model, models } from 'mongoose';

const SmsOptInSchema = new Schema(
  {
    name: {
      type: String,
      trim: true,
      default: '',
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    phone: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['opted_in', 'opted_out'],
      default: 'opted_in',
      index: true,
    },
    source: {
      type: String,
      default: 'sms-opt-in-webform',
    },
    consentText: {
      type: String,
      required: true,
    },
    consentUseCases: {
      type: [
        {
          id: { type: String, required: true },
          endBusiness: { type: String, required: true },
          label: { type: String, required: true },
          category: { type: String, required: true },
          consentText: { type: String, required: true },
          consentedAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
    termsVersion: {
      type: String,
      default: '2026-06-18-end-business-use-cases',
    },
    consentedAt: {
      type: Date,
      default: Date.now,
    },
    optedOutAt: {
      type: Date,
      default: null,
    },
    ipAddress: {
      type: String,
      default: '',
    },
    userAgent: {
      type: String,
      default: '',
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

/** @type {import('mongoose').Model<any>} */
const SmsOptIn = models.SmsOptIn || model('SmsOptIn', SmsOptInSchema);

export default SmsOptIn;
