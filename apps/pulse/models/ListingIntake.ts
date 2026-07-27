import mongoose, { type Model } from 'mongoose';

const ListingIntakeSchema = new mongoose.Schema({
  intakeId: { type: String, required: true, unique: true, index: true },
  ownerId: { type: String, required: true, index: true },
  sourceCommand: { type: String, required: true, maxlength: 20_000 },
  approvedFacts: { type: mongoose.Schema.Types.Mixed, required: true },
  drafts: {
    mls: { type: String, required: true, maxlength: 12_000 },
    social: { type: String, required: true, maxlength: 12_000 },
    buyer: { type: String, required: true, maxlength: 12_000 },
  },
  publishStatus: { type: String, enum: ['review', 'ready'], default: 'review', index: true },
  warnings: { type: [String], default: [] },
  missingFields: { type: [String], default: [] },
  version: { type: Number, required: true, default: 1 },
  propertyApplications: [{
    applicationId: { type: String, required: true },
    propertyId: { type: String, required: true },
    mlsId: { type: String, default: null },
    fields: { type: [String], required: true },
    expectedPropertyLastUpdated: { type: String, default: null },
    appliedPropertyLastUpdated: { type: String, default: null },
    status: { type: String, enum: ['pending', 'applied', 'failed'], required: true },
    failureReason: { type: String, default: null },
    actor: { type: String, required: true },
    createdAt: { type: Date, required: true },
    completedAt: { type: Date, default: null },
  }],
  history: [{
    version: { type: Number, required: true },
    action: { type: String, enum: ['created', 'updated', 'marked_ready'], required: true },
    publishStatus: { type: String, enum: ['review', 'ready'], required: true },
    actor: { type: String, required: true },
    changedAt: { type: Date, required: true },
    approvedFacts: { type: mongoose.Schema.Types.Mixed, required: true },
    drafts: { type: mongoose.Schema.Types.Mixed, required: true },
  }],
}, { timestamps: true });

ListingIntakeSchema.index({ ownerId: 1, updatedAt: -1 });
ListingIntakeSchema.index({ ownerId: 1, publishStatus: 1, updatedAt: -1 });

export const ListingIntake: Model<any> = mongoose.models.ListingIntake || mongoose.model('ListingIntake', ListingIntakeSchema);
