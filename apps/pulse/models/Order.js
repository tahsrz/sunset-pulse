import { Schema, model, models } from 'mongoose';

const OrderSchema = new Schema(
  {
    items: [
      {
        name: { type: String, required: true },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true },
        ageRestricted: { type: Boolean, default: false },
        minimumAge: { type: Number },
        restrictedCategory: {
          type: String,
          enum: ['tobacco', 'alcohol', 'lotto', 'fuel', 'none'],
          default: 'none',
        },
      },
    ],
    totalAmount: { type: Number, required: true },
    status: {
      type: String,
      enum: ['pending', 'cooking', 'completed', 'cancelled'],
      default: 'pending',
    },
    isPaid: {
      type: Boolean,
      default: false,
    },
    paymentState: {
      type: String,
      enum: [
        'UNPAID',
        'PENDING_POS_TENDER',
        'PAID_STRIPE',
        'PAID_POS',
        'PAYMENT_FAILED',
        'REFUNDED',
        'VOIDED',
        'MANUAL_REVIEW',
      ],
      default: 'UNPAID',
      index: true,
    },
    paymentSessionId: {
      type: String,
    },
    pickupCode: {
      type: String,
      index: true,
    },
    paymentReference: {
      type: String,
    },
    customerName: {
      type: String,
    },
    idVerifiedAt: {
      type: Date,
    },
    releasedAt: {
      type: Date,
    },
    posProperties: {
      posTransactionId: {
        type: String,
        default: null,
      },
      terminalId: {
        type: String,
        default: null,
      },
      tenderType: {
        type: String,
        enum: ['CASH', 'CREDIT_DEBIT', 'STORE_ACCOUNT', 'APP_LENDER', null],
        default: null,
      },
      posSyncStatus: {
        type: String,
        enum: ['IDLE', 'PENDING_POS_TENDER', 'SYNCED', 'REVERSED', 'FAILED'],
        default: 'IDLE',
      },
      authCode: {
        type: String,
        default: null,
      },
      idVerifiedByCashier: {
        type: Boolean,
        default: false,
      },
      lastSyncedAt: {
        type: Date,
      },
      failureReason: {
        type: String,
      },
    },
    posEvents: [
      {
        eventId: { type: String, required: true },
        type: { type: String, required: true },
        posTransactionId: { type: String },
        amount: { type: Number },
        tenderType: { type: String },
        authCode: { type: String },
        terminalId: { type: String },
        receivedAt: { type: Date, default: Date.now },
        rawDigest: { type: String },
      },
    ],
    // Useful if you want to link it to a logged-in user
    user: {
      type: String,
    },
    scheduledTime: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

OrderSchema.index({ 'posEvents.eventId': 1 });
OrderSchema.index(
  { 'posProperties.posTransactionId': 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: { 'posProperties.posTransactionId': { $type: 'string' } },
  }
);

/** @type {import('mongoose').Model<any>} */
const Order = models.Order || model('Order', OrderSchema);
export default Order;
