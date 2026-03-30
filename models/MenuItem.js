import mongoose from 'mongoose';
const { Schema, model, models } = mongoose;

const MenuItemSchema = new Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  description: { type: String },
  category: { type: String },
  isAvailable: { type: Boolean, default: true },
}, {
  timestamps: true
});

const MenuItem = models.MenuItem || model('MenuItem', MenuItemSchema);
export default MenuItem;