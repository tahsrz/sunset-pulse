import mongoose from 'mongoose';

const { Schema, model, models } = mongoose;

const CallAssistSessionSchema = new Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  leadId: {
    type: String,
    index: true,
  },
  customerPhone: {
    type: String,
  },
  agentPhone: {
    type: String,
  },
  status: {
    type: String,
    enum: ['created', 'consent_pending', 'bridging', 'streaming', 'completed', 'failed', 'declined'],
    default: 'created',
    index: true,
  },
  callSid: {
    type: String,
    index: true,
  },
  streamSid: {
    type: String,
    index: true,
  },
  streamName: {
    type: String,
  },
  streamUrl: {
    type: String,
  },
  bridgeUrl: {
    type: String,
  },
  context: {
    type: Schema.Types.Mixed,
    default: {},
  },
  consent: {
    type: Schema.Types.Mixed,
    default: {},
  },
  transcript: {
    type: String,
    default: '',
  },
  analysis: {
    type: Schema.Types.Mixed,
  },
  summarySavedAt: {
    type: Date,
  },
  lastError: {
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
  endedAt: {
    type: String,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
});

CallAssistSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default models.CallAssistSession || model('CallAssistSession', CallAssistSessionSchema);
