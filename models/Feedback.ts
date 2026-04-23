import { Schema, model, models } from 'mongoose';

const FeedbackSchema = new Schema(
  {
    user: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    subject: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['NEW', 'REVIEWED', 'RESOLVED'],
      default: 'NEW',
    },
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'MEDIUM',
    }
  },
  {
    timestamps: true,
  }
);

const Feedback = models.Feedback || model('Feedback', FeedbackSchema);

export default Feedback;
