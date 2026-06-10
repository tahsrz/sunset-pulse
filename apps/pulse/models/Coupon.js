import { Schema, model, models } from 'mongoose';

const CouponSchema = new Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    label: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    type: {
      type: String,
      enum: ['fixed_amount', 'percent', 'free_item'],
      required: true,
    },
    amountOff: {
      type: Number,
    },
    percentOff: {
      type: Number,
    },
    freeItemName: {
      type: String,
    },
    minimumSubtotal: {
      type: Number,
      default: 0,
    },
    maxDiscount: {
      type: Number,
    },
    firstOrderOnly: {
      type: Boolean,
      default: false,
    },
    usageLimit: {
      type: Number,
    },
    usedCount: {
      type: Number,
      default: 0,
    },
    expiresAt: {
      type: Date,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

/** @type {import('mongoose').Model<any>} */
const Coupon = models.Coupon || model('Coupon', CouponSchema);
export default Coupon;
