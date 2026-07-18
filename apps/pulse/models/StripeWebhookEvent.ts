import mongoose from 'mongoose';
import type { Model } from 'mongoose';

const StripeWebhookEventSchema = new mongoose.Schema({
  eventId: { type: String, required: true, unique: true, index: true },
  eventType: { type: String, required: true, index: true },
  objectId: { type: String, default: '' },
  livemode: { type: Boolean, default: false },
  status: {
    type: String,
    enum: ['processing', 'succeeded', 'failed'],
    default: 'processing',
    index: true,
  },
  receivedAt: { type: Date, default: Date.now },
  completedAt: { type: Date },
  failedAt: { type: Date },
  errorMessage: { type: String, default: '' },
  duplicateCount: { type: Number, default: 0 },
  payloadSnapshot: { type: mongoose.Schema.Types.Mixed, default: null },
}, {
  timestamps: true,
});

export const StripeWebhookEvent: Model<any> =
  mongoose.models.StripeWebhookEvent || mongoose.model('StripeWebhookEvent', StripeWebhookEventSchema);
