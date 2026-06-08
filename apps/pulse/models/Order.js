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
        customization: {
          sauces: [{ type: String }],
          vegetables: [{ type: String }],
          allTheWay: { type: Boolean, default: false },
          removedVegetables: [{ type: String }],
        },
      },
    ],
    subtotalAmount: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    coupon: {
      code: { type: String },
      label: { type: String },
      description: { type: String },
      type: {
        type: String,
        enum: ['fixed_amount', 'percent', 'free_item', null],
        default: null,
      },
      discountAmount: { type: Number, default: 0 },
      freeItemName: { type: String },
    },
    totalAmount: { type: Number, required: true },
    status: {
      type: String,
      enum: ['pending', 'cooking', 'ready', 'completed', 'cancelled'],
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
    customerEmail: {
      type: String,
    },
    emailConfirmation: {
      status: {
        type: String,
        enum: ['not_started', 'not_configured', 'sent', 'failed'],
        default: 'not_started',
        index: true,
      },
      providerId: { type: String },
      sentTo: { type: String },
      lastError: { type: String },
      sentAt: { type: Date },
      updatedAt: { type: Date },
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
    estimatedWaitMinutes: {
      type: Number,
      default: 15,
    },
    estimatedReadyAt: {
      type: Date,
    },
    phoneRelay: {
      status: {
        type: String,
        enum: [
          'not_started',
          'not_configured',
          'pending',
          'confirmed',
          'repeat_requested',
          'needs_human',
          'no_input',
          'failed',
          'sent',
        ],
        default: 'not_started',
        index: true,
      },
      relayId: { type: String, index: true },
      callSid: { type: String },
      attempts: { type: Number, default: 0 },
      lastDigits: { type: String },
      lastError: { type: String },
      lastCalledAt: { type: Date },
      confirmedAt: { type: Date },
      updatedAt: { type: Date },
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
