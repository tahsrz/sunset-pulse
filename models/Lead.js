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
    },
    phone: {
      type: String,
    },
    property: {
      type: Schema.Types.ObjectId,
      ref: 'Property',
      required: true,
    },
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
  },
  {
    timestamps: true,
  }
);

const Lead = models.Lead || model('Lead', LeadSchema);

export default Lead;
