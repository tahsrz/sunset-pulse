import mongoose from 'mongoose';
const { Schema, model, models } = mongoose;
const PropertySchema = new Schema(
  {
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    location: {
      street: {
        type: String,
      },
      city: {
        type: String,
      },
      state: {
        type: String,
      },
      zipcode: {
        type: String,
      },
    },
    location_geo: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        index: '2dsphere',
      },
    },
    beds: {
      type: Number,
    },
    baths: {
      type: Number,
    },
    square_feet: {
      type: Number,
    },
    rv_type: {
      type: String,
      enum: ['Class A', 'Class B', 'Class C', 'Travel Trailer', 'Fifth Wheel', 'Toy Hauler', 'Other'],
    },
    rv_length: {
      type: Number, // In feet
    },
    hookups: {
      water: { type: Boolean, default: false },
      sewer: { type: Boolean, default: false },
      electric: { type: String, enum: ['None', '30-Amp', '50-Amp', 'Both'], default: 'None' },
    },
    amenities: [
      {
        type: String,
      },
    ],
    rates: {
      nightly: {
        type: Number,
      },
      weekly: {
        type: Number,
      },
      monthly: {
        type: Number,
      },
    },
    seller_info: {
      name: {
        type: String,
      },
      email: {
        type: String,
      },
      phone: {
        type: String,
      },
    },
    images: [
      {
        type: String,
      },
    ],
    is_featured: {
      type: Boolean,
      default: false,
    },
    source: {
      type: String,
      enum: ['Internal', 'MLS'],
      default: 'Internal',
    },
    mls_id: {
      type: String,
    },
    listing_status: {
      type: String,
      default: 'Active',
    },
  },
  {
    timestamps: true,
  }
);

const Property = models.Property || model('Property', PropertySchema);
export default Property;
