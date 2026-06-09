import mongoose from 'mongoose';
const { Schema, model, models } = mongoose;
const MenuItemSchema = new Schema({
  id: { type: String, index: true },
  agentId: { type: String, required: true, default: 'taz-realty-001' },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  description: { type: String },
  category: { type: String },
  options: [
    {
      key: { type: String, required: true },
      label: { type: String, required: true },
      required: { type: Boolean, default: false },
      defaultValue: { type: String },
      choices: [
        {
          value: { type: String, required: true },
          label: { type: String, required: true },
          description: { type: String },
        },
      ],
    },
  ],
  isAvailable: { type: Boolean, default: true },
  isDaisyPick: { type: Boolean, default: false },
  isStaffPick: { type: Boolean, default: false },
}, {
  timestamps: true
});

/** @type {import('mongoose').Model<any>} */
const MenuItem = models.MenuItem || model('MenuItem', MenuItemSchema);
export default MenuItem;
