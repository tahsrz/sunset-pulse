import mongoose, { type Model } from 'mongoose';

const PropertyScanSessionSchema = new mongoose.Schema({
  scanId: { type: String, required: true, unique: true, index: true },
  ownerId: { type: String, required: true, index: true },
  propertyAddress: { type: String, required: true, maxlength: 500 },
  listingId: { type: String, default: null, index: true },
  captureMode: { type: String, enum: ['guided_video', 'photo_walkthrough', 'lidar_capture'], required: true },
  status: { type: String, enum: ['capture_ready', 'in_review', 'approved', 'rejected'], required: true, default: 'capture_ready', index: true },
  consent: {
    ownerAuthorized: { type: Boolean, required: true },
    interiorCaptureAcknowledged: { type: Boolean, required: true },
    publicListingApproval: { type: Boolean, required: true, default: false },
  },
  assets: [{
    path: { type: String, required: true },
    fileName: { type: String, required: true, maxlength: 255 },
    mimeType: { type: String, required: true, maxlength: 120 },
    size: { type: Number, required: true },
    capturedAt: { type: Date, required: true },
  }],
}, { timestamps: true });

PropertyScanSessionSchema.index({ ownerId: 1, updatedAt: -1 });

export const PropertyScanSession: Model<any> = mongoose.models.PropertyScanSession
  || mongoose.model('PropertyScanSession', PropertyScanSessionSchema);

