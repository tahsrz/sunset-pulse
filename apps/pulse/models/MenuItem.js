import mongoose from 'mongoose';
const { Schema, model, models } = mongoose;
const MenuItemSchema = new Schema({
  agentId: { type: String, required: true, default: 'taz-realty-001' },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  description: { type: String },
  category: { type: String },
  isAvailable: { type: Boolean, default: true },
  isDaisyPick: { type: Boolean, default: false },
  isStaffPick: { type: Boolean, default: false },
}, {
  timestamps: true
});

/** @type {import('mongoose').Model<any>} */
const MenuItem = models.MenuItem || model('MenuItem', MenuItemSchema);
export default MenuItem;
