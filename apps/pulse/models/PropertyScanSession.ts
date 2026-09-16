import mongoose, { type Model } from 'mongoose';

const PropertyScanSessionSchema = new mongoose.Schema({
  scanId: { type: String, required: true, unique: true, index: true },
  ownerId: { type: String, required: true, index: true },
  propertyAddress: { type: String, required: true, maxlength: 500 },
  listingId: { type: String, default: null, index: true },
  listingLinkStatus: { type: String, enum: ['unresolved', 'verified'], required: true, default: 'unresolved' },
  shortlistEntryId: { type: String, default: null, index: true },
  captureMode: { type: String, enum: ['guided_video', 'photo_walkthrough', 'lidar_capture'], required: true },
  status: { type: String, enum: ['capture_ready', 'in_review', 'approved', 'rejected'], required: true, default: 'capture_ready', index: true },
  reviewNote: { type: String, default: null, maxlength: 2000 },
  reviewedAt: { type: Date, default: null },
  reviewedBy: { type: String, default: null },
  reviewerIds: { type: [String], default: [] },
  schemaVersion: { type: Number, required: true, default: 2 },
  revision: { type: Number, required: true, default: 1, min: 1 },
  manifestHash: { type: String, required: true, default: '' },
  consentReceipt: {
    actorId: { type: String, required: false },
    policyVersion: { type: String, required: false },
    acceptedAt: { type: Date, required: false },
  },
  approvedManifestRevision: { type: Number, default: null },
  approvedManifestHash: { type: String, default: null },
  reviewEvents: [{
    eventId: { type: String, required: true },
    status: { type: String, enum: ['in_review', 'approved', 'rejected'], required: true },
    reviewerId: { type: String, required: true },
    note: { type: String, default: null, maxlength: 2000 },
    revision: { type: Number, required: true },
    manifestHash: { type: String, required: true },
    createdAt: { type: Date, required: true },
  }],
  artifactRefs: [{
    artifactId: { type: String, required: true },
    inputRevision: { type: Number, required: true },
    inputManifestHash: { type: String, required: true },
    status: { type: String, enum: ['current', 'stale', 'revoked'], required: true },
    createdAt: { type: Date, required: true },
  }],
  reconstruction: {
    jobId: { type: String, default: null },
    status: { type: String, enum: ['ready', 'failed'], default: null },
    progress: { type: Number, default: 0 },
    engine: { type: String, default: null },
    previewKind: { type: String, default: null },
    roomCount: { type: Number, default: 0 },
    assetCount: { type: Number, default: 0 },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    error: { type: String, default: null },
  },
  consent: {
    ownerAuthorized: { type: Boolean, required: true },
    interiorCaptureAcknowledged: { type: Boolean, required: true },
    publicListingApproval: { type: Boolean, required: true, default: false },
  },
  assets: [{
    assetId: { type: String, required: false },
    path: { type: String, required: true },
    fileName: { type: String, required: true, maxlength: 255 },
    mimeType: { type: String, required: true, maxlength: 120 },
    size: { type: Number, required: true },
    capturedAt: { type: Date, required: false },
    uploadedAt: { type: Date, required: true, default: Date.now },
  }],
}, { timestamps: true });

PropertyScanSessionSchema.index({ ownerId: 1, updatedAt: -1 });
PropertyScanSessionSchema.index({ reviewerIds: 1, updatedAt: -1 });

export const PropertyScanSession: Model<any> = mongoose.models.PropertyScanSession
  || mongoose.model('PropertyScanSession', PropertyScanSessionSchema);
