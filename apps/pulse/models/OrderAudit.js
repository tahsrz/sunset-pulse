import { Schema, model, models } from 'mongoose';

const OrderAuditSchema = new Schema(
  {
    order: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      index: true,
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    previousStatus: {
      type: String,
    },
    nextStatus: {
      type: String,
    },
    actorId: {
      type: String,
    },
    actorRole: {
      type: String,
    },
    actorName: {
      type: String,
    },
    deviceId: {
      type: String,
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

OrderAuditSchema.index({ order: 1, createdAt: -1 });

/** @type {import('mongoose').Model<any>} */
const OrderAudit = models.OrderAudit || model('OrderAudit', OrderAuditSchema);
export default OrderAudit;
