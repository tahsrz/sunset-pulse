import { Schema, model, models } from 'mongoose';

const OrderSchema = new Schema(
  {
    items: [
      {
        name: { type: String, required: true },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true },
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
    paymentSessionId: {
      type: String,
    },
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

/** @type {import('mongoose').Model<any>} */
const Order = models.Order || model('Order', OrderSchema);
export default Order;
