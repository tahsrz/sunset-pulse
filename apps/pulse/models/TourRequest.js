import mongoose from 'mongoose';
const { Schema, model, models } = mongoose;

const TourRequestSchema = new Schema(
  {
    property: {
      type: Schema.Types.ObjectId,
      ref: 'Property',
      required: true,
    },
    user: {
      type: String, // Supabase ID
      required: true,
    },
    userName: String,
    userEmail: String,
    userPhone: String,
    preferredDate: {
      type: Date,
      required: true,
    },
    preferredTime: {
      type: String,
      required: true,
    },
    tourType: {
      type: String,
      enum: ['In-Person', 'Virtual', 'Drone-Stream', 'Jamie-Guided'],
      default: 'In-Person',
    },
    status: {
      type: String,
      enum: ['Pending', 'Confirmed', 'Rescheduled', 'Cancelled', 'Completed'],
      default: 'Pending',
    },
    message: String,
    agentId: {
      type: String,
      default: 'taz-realty-001'
    }
  },
  {
    timestamps: true,
  }
);

/** @type {import('mongoose').Model<any>} */
const TourRequest = models.TourRequest || model('TourRequest', TourRequestSchema);
export default TourRequest;
