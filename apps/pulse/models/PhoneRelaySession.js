import { Schema, model, models } from 'mongoose';

const PhoneRelaySessionSchema = new Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  orderId: {
    type: String,
    index: true,
  },
  ticket: {
    type: String,
    required: true,
  },
  callScript: {
    type: String,
    required: true,
  },
  madeDifferent: {
    type: Boolean,
    default: false,
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'repeat_requested', 'needs_human', 'no_input'],
    default: 'pending',
    index: true,
  },
  attempts: {
    type: Number,
    default: 0,
  },
  lastDigits: {
    type: String,
  },
  createdAt: {
    type: String,
    required: true,
  },
  updatedAt: {
    type: String,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
});

PhoneRelaySessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default models.PhoneRelaySession || model('PhoneRelaySession', PhoneRelaySessionSchema);
