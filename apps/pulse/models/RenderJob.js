import mongoose from 'mongoose';
const { Schema, model, models } = mongoose;

const RenderJobSchema = new Schema(
  {
    jobId: { type: String, required: true, unique: true },
    recipe: { type: Object, required: true },
    status: { 
      type: String, 
      enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'], 
      default: 'PENDING' 
    },
    progress: { type: Number, default: 0 },
    outputUrl: { type: String },
    error: { type: String },
    priority: { type: Number, default: 1 }
  },
  { timestamps: true }
);

/** @type {import('mongoose').Model<any>} */
const RenderJob = models.RenderJob || model('RenderJob', RenderJobSchema);
export default RenderJob;
