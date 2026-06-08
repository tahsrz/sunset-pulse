import { Schema, model, models } from 'mongoose';

const SunsetChatPostSchema = new Schema(
  {
    nickname: {
      type: String,
      required: true,
      trim: true,
      maxlength: 32,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 240,
    },
    tag: {
      type: String,
      enum: ['Food', 'Store', 'Local', 'Deal', 'Lost & Found'],
      default: 'Local',
      index: true,
    },
    isPinned: {
      type: Boolean,
      default: false,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    deviceKey: {
      type: String,
      index: true,
    },
    ipHash: {
      type: String,
      index: true,
    },
    staffActionBy: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

SunsetChatPostSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
SunsetChatPostSchema.index({ isPinned: -1, createdAt: -1 });

const SunsetChatPost = models.SunsetChatPost || model('SunsetChatPost', SunsetChatPostSchema);
export default SunsetChatPost;
