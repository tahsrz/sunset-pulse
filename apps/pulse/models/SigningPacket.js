import { Schema, model, models } from 'mongoose';

const SigningPacketSchema = new Schema(
  {
    title: { type: String, required: true },
    status: {
      type: String,
      enum: ['draft', 'sent', 'partially_signed', 'completed', 'voided'],
      default: 'draft',
      index: true,
    },
    createdBy: { type: String },
    draftPayload: { type: Schema.Types.Mixed, required: true },
    payloadHash: { type: String, required: true, index: true },
    finalHash: { type: String },
    signerLinks: [
      {
        role: { type: String, required: true },
        name: { type: String, required: true },
        email: { type: String },
        token: { type: String, required: true, index: true },
        routingOrder: { type: Number, default: 1 },
        status: {
          type: String,
          enum: ['pending', 'viewed', 'signed'],
          default: 'pending',
        },
        viewedAt: { type: Date },
        signedAt: { type: Date },
        consentText: { type: String },
        signature: {
          typedName: { type: String },
          signatureDataUrl: { type: String },
          signedAtLocal: { type: String },
        },
      },
    ],
    auditTrail: [
      {
        type: { type: String, required: true },
        actorRole: { type: String },
        actorName: { type: String },
        actorEmail: { type: String },
        ipAddress: { type: String },
        userAgent: { type: String },
        payloadHash: { type: String },
        createdAt: { type: Date, default: Date.now },
        metadata: { type: Schema.Types.Mixed },
      },
    ],
  },
  { timestamps: true }
);

/** @type {import('mongoose').Model<any>} */
const SigningPacket = models.SigningPacket || model('SigningPacket', SigningPacketSchema);
export default SigningPacket;
