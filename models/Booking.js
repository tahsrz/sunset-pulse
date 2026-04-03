import mongoose from 'mongoose';
const { Schema, model, models } = mongoose;

const BookingSchema = new Schema(
  {
    property: {
      type: Schema.Types.ObjectId,
      ref: 'Property',
      required: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    checkIn: {
      type: Date,
      required: true,
    },
    checkOut: {
      type: Date,
      required: true,
    },
    guests: {
      type: Number,
      required: true,
      default: 1,
    },
    totalPrice: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['Pending', 'Confirmed', 'Cancelled'],
      default: 'Pending',
    },
    specifications: {
      rvType: String,
      rvLength: Number,
      beds: Number,
      baths: Number,
    },
  },
  {
    timestamps: true,
  }
);

const Booking = models.Booking || model('Booking', BookingSchema);
export default Booking;
