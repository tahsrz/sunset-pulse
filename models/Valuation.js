import mongoose from 'mongoose';
const { Schema, model, models } = mongoose;

const ValuationSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    address: {
      type: String,
      required: true,
    },
    estimate: {
      type: Number,
      required: true,
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
    // Explainable Comps Engine (MLS Source)
    mls_comps: {
      sold_price_avg: Number,
      beds: Number,
      baths: Number,
      sqft: Number,
      days_on_market: Number,
      list_to_sale_ratio: Number,
      subdivision: String,
      comp_count: { type: Number, default: 0 }
    },
    // Accuracy Boost (ATTOM / ML Source)
    ml_adjustments: {
      lot_size: Number,
      year_built: Number,
      condition_proxy: Number, // 1-10 scale
      ownership_length: Number, // years
      tax_assessed_value: Number,
      neighborhood_turnover: Number, // percentage
      school_score: Number,
      census_poverty_index: Number,
      price_trend_index: Number // relative to county avg
    },
    status: {
      type: String,
      enum: ['Draft', 'Confirmed'],
      default: 'Draft',
    },
    intelligence_score: {
      type: Number,
      default: 85,
    }
  },
  {
    timestamps: true,
  }
);

const Valuation = models.Valuation || model('Valuation', ValuationSchema);
export default Valuation;
